const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Post = require('./models/post');

const app = express();

// middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret_key', // change this
    resave: false,
    saveUninitialized: false
}));

// database connection
mongoose.connect('mongodb://127.0.0.1:27017/nodejs')
    .then(() => console.log('Connected to MongoDB: nodejs'))
    .catch(err => console.error(err));

const signupUser = async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // 1. NEW CHECK: Disallow whitespaces in ID or Password
    if (/\s/.test(username) || /\s/.test(password)) {
        return res.render('signup', { error: 'Username and password cannot contain spaces.' });
    }

    // 2. Existing check for 'admin'
    if (username.toLowerCase() === 'admin') {
        return res.render('signup', { error: 'You cannot use "admin" as a username.' });
    }

    // 3. Existing password match check
    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match' });
    }

    try {
        const existingUser = await User.findOne({ id: username });
        if (existingUser) {
            return res.render('signup', { error: 'Username is already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            id: username,
            password: hashedPassword,
            roles: ['user'] 
        });

        await newUser.save();
        res.redirect('/login');

    } catch (err) {
        console.error(err);
        res.render('signup', { error: 'Server error, please try again.' });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Find the user by ID (username)
        const user = await User.findOne({ id: username });

        // 2. Validate: If user not found, return error
        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // 3. Validate: Compare provided password with stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // 4. Session Management: Initialize session upon successful login
        // We store the ID and Roles so we can use them in the views later
        req.session.user = {
            id: user.id,
            roles: user.roles
        };

        // 5. Success: Redirect to main feed
        res.redirect('/');

    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error during login.' });
    }
};

const logoutUser = (req, res) => {
    // 1. Handle user logout by destroying the session
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.redirect('/');
        }
        // 2. Redirect to login page after logout
        res.redirect('/login');
    });
};

// post controllers
const createPost = async (req, res) => {
    // 1. Authentication Check: Ensure user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // 2. Data Preparation: Get content and author
        const { content } = req.body;
        const author = req.session.user.id; // Get ID from the active session

        // 3. Create Post: Initialize the new post document
        const newPost = new Post({
            author: author,
            content: content,
            // likes: defaults to 0 (defined in Model)
            // createdAt: defaults to Date.now (defined in Model)
        });

        // 4. Save to Database
        await newPost.save();

        // 5. Redirect: Go back to the main feed
        res.redirect('/');

    } catch (err) {
        console.error(err);
        // On error, reload the page (or you could render with an error message)
        res.redirect('/newpost');
    }
};

const getPosts = async (req, res) => {
    // 1. Authentication Check
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // 2. Fetch Posts: Find all posts and sort them by date (Newest first)
        const posts = await Post.find().sort({ createdAt: -1 });

        // 3. Render View: Pass the user info and the list of posts to the template
        res.render('main', { 
            user: req.session.user, 
            posts: posts 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching posts");
    }
};

const likePost = async (req, res) => {
    // 1. Authentication Check
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.body;
    const userId = req.session.user.id;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        let updatedPost;

        // 3. Toggle Logic
        if (post.likedBy.includes(userId)) {
            // UNLIKE: Remove user, decrement count
            updatedPost = await Post.findByIdAndUpdate(postId, { 
                $pull: { likedBy: userId },
                $inc: { likes: -1 }
            }, { new: true }); // {new: true} returns the updated document
        } else {
            // LIKE: Add user, increment count
            updatedPost = await Post.findByIdAndUpdate(postId, { 
                $addToSet: { likedBy: userId },
                $inc: { likes: 1 }
            }, { new: true });
        }

        // Return JSON instead of redirecting
        res.json({ 
            success: true, 
            likes: updatedPost.likes, 
            isLiked: updatedPost.likedBy.includes(userId) 
        });

    } catch (err) {
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
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
};

// Routes

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