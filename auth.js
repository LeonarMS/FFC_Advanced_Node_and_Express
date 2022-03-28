'use strict';
require('dotenv').config();

const session = require('express-session');
const passport = require('passport');
const ObjectId = require('mongodb').ObjectId;
const LocalStrategy = require('passport-local');

const bcrypt = require('bcrypt');

const GitHubStrategy = require('passport-github').Strategy;

module.exports = function(app, myDataBase) {
  
  app.use(passport.initialize());

  // Serialize|Deserialize users
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc)
    })
  });

  // Set up local strategy
  passport.use(new LocalStrategy(
    function(username, password, done) {
      myDataBase.findOne({ username: username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (!bcrypt.compareSync(password, user.password)) return done(null, false);

        return done(null, user);
      })
    }
  ));

  // Set up GitHub strategy
  const URL = 'https://boilerplate-advancednode-2.leonardom6.repl.co/auth/github/callback';

  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'https://boilerplate-advancednode-2.leonardom6.repl.co/auth/github/callback'
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);

      myDataBase.findOneAndUpdate(
        { id: profile.id },
        {
          $setOnInsert: {
            id: profile.id,
            name: profile.displayName || 'John Doe',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails)
              ? profile.emails[0].value
              : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        },
        { upsert: true, new: true },
        (err, doc) => {
          if (err) return console.error(err)
          return cb(null, doc.value);
        }
      );
    }
  ));

}