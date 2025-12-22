const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Post = require('./models/post');

const app = express();

////////////////////////////////////////
// middleware
////////////////////////////////////////
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret_key', // load session id from env
    resave: false,
    saveUninitialized: false
}));

////////////////////////////////////////
// database connection
////////////////////////////////////////
mongoose.connect('mongodb://127.0.0.1:27017/nodejs')
    .then(() => console.log('Connected to MongoDB: nodejs'))
    .catch(err => console.error(err));

const signupUser = async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // don't allow whitespaces in id or pw
    if (/\s/.test(username) || /\s/.test(password)) {
        return res.render('signup', { error: 'Username and password cannot contain spaces.' });
    }

    // check if admin exists
    if (username.toLowerCase() === 'admin') {
        return res.render('signup', { error: 'You cannot use "admin" as a username.' });
    }

    // check if pw matches
    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match' });
    }

    try {
        const existingUser = await User.findOne({ id: username });
        if (existingUser) {
            return res.render('signup', { error: 'Username is already taken' }); // error if username exists in db
        }

        const hashedPassword = await bcrypt.hash(password, 10); // hash pw

        const newUser = new User({ // new entry on signup success
            id: username,
            password: hashedPassword,
            roles: ['user'] 
        });

        await newUser.save();
        res.redirect('/login');

    } catch (err) { // throw error if no response or false response from server
        console.error(err);
        res.render('signup', { error: 'Server error, please try again.' });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // find the user by id
        const user = await User.findOne({ id: username });

        // valdiation
        // if user is not found, return error
        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // compare pw with stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // init session on login success
        // store id and roles to use later in views
        req.session.user = {
            id: user.id,
            roles: user.roles
        };

        // redirect to main feed
        res.redirect('/');

    } catch (err) { // throw error if no response or false response from server
        console.error(err);
        res.render('login', { error: 'Server error during login.' });
    }
};

const logoutUser = (req, res) => {
    // handle user logout by destroying the session
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.redirect('/');
        }
        // redirect to login page after logout
        res.redirect('/login');
    });
};

////////////////////////////////////////
// post controllers
////////////////////////////////////////
const createPost = async (req, res) => {
    // authentication check
    // check if user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // get content and author
        const { content } = req.body;
        const author = req.session.user.id; // get id from the active session

        // init new post document
        const newPost = new Post({
            author: author,
            content: content,
            // likes: defaults to 0 (defined in Model)
            // createdAt: defaults to Date.now (defined in Model)
        });

        // save to db
        await newPost.save();

        // redirect to main feed
        res.redirect('/');

    } catch (err) {
        // reload page on error
        console.error(err);
        res.redirect('/newpost');
    }
};

const getPosts = async (req, res) => {
    // authentication check
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // fetch all posts and sort them in chronological order
        const posts = await Post.find().sort({ createdAt: -1 });

        // pass the user info and the list of posts to render view
        res.render('main', { 
            user: req.session.user, 
            posts: posts 
        });

    } catch (err) { // throw error fetching posts fails
        console.error(err);
        res.status(500).send("Error fetching posts");
    }
};

const likePost = async (req, res) => {
    // authentication check
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.body;
    const userId = req.session.user.id;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        let updatedPost;

        // toggle like
        if (post.likedBy.includes(userId)) {
            // unlike -> remove user, decrement count
            updatedPost = await Post.findByIdAndUpdate(postId, { 
                $pull: { likedBy: userId },
                $inc: { likes: -1 }
            }, { new: true });
        } else {
            // like -> add user, increment count
            updatedPost = await Post.findByIdAndUpdate(postId, { 
                $addToSet: { likedBy: userId },
                $inc: { likes: 1 }
            }, { new: true });
        }

        // return json
        // no redirection here -> handled with async function in /public/script.js
        res.json({ 
            success: true, 
            likes: updatedPost.likes, 
            isLiked: updatedPost.likedBy.includes(userId) 
        });

    } catch (err) { // throw error if no response or false response from server
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const deletePost = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { postId } = req.body;
    const currentUser = req.session.user;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.redirect('/');
        
        if (post.author === currentUser.id || currentUser.roles.includes('admin')) {
            await Post.findByIdAndDelete(postId);
        }

        res.redirect('/');
    } catch (err) { // throw error if no response or false response from server
        console.error(err);
        res.redirect('/');
    }
};

////////////////////////////////////////
// routes
////////////////////////////////////////

// page renders
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/newpost', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('newpost');
});
app.get('/', getPosts); 

// actions
app.post('/signup', signupUser);
app.post('/login', loginUser);
app.get('/logout', logoutUser); // usually a link or button
app.post('/createPost', createPost);
app.post('/likePost', likePost);
app.post('/deletePost', deletePost);

// start server
app.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log("127.0.0.1:3000");
});