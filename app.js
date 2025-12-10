const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Post = require('./models/Post');

const app = express();

// middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(session({
    secret: 'secret_key', // change this
    resave: false,
    saveUninitialized: false
}));

// database connection
mongoose.connect('mongodb://127.0.0.1:27017/nodejs')
    .then(() => console.log('Connected to MongoDB: nodejs'))
    .catch(err => console.error(err));

// controllers [cite: 48]

// authentication controllers
const signupUser = async (req, res) => {
    const { username, password, confirmPassword } = req.body;
    // TODO: validate passwords match [cite: 34]
    // TODO: check if user exists [cite: 53]
    // TODO: hash password using bcrypt [cite: 52]
    // TODO: save new User
    res.redirect('/login');
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    // TODO: find user, compare password with bcrypt [cite: 56]
    // TODO: set req.session.user = user.id [cite: 57]
    res.redirect('/');
};

const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

// post controllers
const createPost = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    // TODO: create new Post using req.body.content and req.session.user [cite: 62]
    res.redirect('/');
};

const getPosts = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    // TODO: find all posts, sort by createdAt desc [cite: 37]
    // const posts = await Post.find().sort({ createdAt: -1 });
    res.render('main', { user: req.session.user, posts: [] }); // Pass actual posts here
};

const deletePost = async (req, res) => {
    const postId = req.body.postId;
    // TODO: find post, check if current user is author or admin [cite: 69]
    // TODO: delete post [cite: 70]
    res.redirect('/');
};

// Routes

// page renders
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/newpost', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('newpost');
});
app.get('/', getPosts); // main page feed [cite: 65]

// actions
app.post('/signup', signupUser);
app.post('/login', loginUser);
app.get('/logout', logoutUser); // usually a link or button
app.post('/createPost', createPost);
app.post('/deletePost', deletePost);

// start server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});