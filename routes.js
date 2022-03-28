  'use strict';
  require('dotenv').config();
  
  const passport = require('passport');
  const bcrypt = require('bcrypt');
  
  
  module.exports = function(app, myDataBase) {    
    app.use(passport.initialize());
  
    // Ensure user is authenticated before moving on, if not redirect to homepage
    const ensureAuthenticated = (req, res, next) => {
  
      if (req.isAuthenticated()) return next();
      res.redirect('/');
    }
  
    // +++++  ROUTES  +++++
    app.route('/').get((req, res) => {
      res.render(process.cwd() + '/views/pug', {
        title: 'Connected to Database',
        message: 'Please login',
        showLogin: true,
        showRegistration: true,
        showSocialAuth: true
      });
    });
  
    // Authenticate user
    app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
      res.redirect('/profile');
    });
  
    // Serve profile page, only if user is authenticated
    app.route('/profile').get(ensureAuthenticated, (req, res) => {
      res.render((process.cwd() + '/views/pug/profile'), {
        username: req.user.username
      });
    });
  
    // Logout the user and redirect to homepage
    app.route('/logout').get((req, res) => {
      req.logout();
      res.redirect('/');
    });
  
    // Register new user
    app.route('/register')
      .post((req, res, next) => {
        // Set hash of user password
        const hash = bcrypt.hashSync(req.body.password, 12);
  
        // Find user, check for errors, and if that user already exists. If not insert new user and redirect
  
        myDataBase.findOne({ username: req.body.username }, (err, user) => {
          if (err) next(err);
          else if (user) res.redirect('/');
          else {
            myDataBase.insertOne({
              username: req.body.username,
              password: hash
            },
              (err, doc) => {
                if (err) res.redirect('/');
                else {
                  // The inserted document is held within
                  // the ops property of the doc
                  next(null, doc.ops[0]);
                }
              }
            );
          }
        });
      },
        passport.authenticate('local', { failureRedirect: '/' }),
        (req, res) => {
          res.redirect('/profile');
        }
      );
  
    // Implementation of social authentication 'github'
    app.route('/auth/github').get(passport.authenticate('github'));
    app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
      req.session.user_id = req.user.id;
      res.redirect('/chat');
    });
  
    // Render chat.pug
    app.route('/chat').get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/chat', {
        user: req.user
      })
    })
  
    // Handle missing pages
    app.use((req, res, next) => {
      res.status(404)
        .type('text')
        .send('Not Found');
    });
  }