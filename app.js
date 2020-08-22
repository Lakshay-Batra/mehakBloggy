require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const _ = require("lodash");
const descriptions = require(__dirname + "/descriptions.js");
const dateTime = require(__dirname+"/date.js");
const mongoose = require("mongoose");
const flash = require('connect-flash');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_CLUSTER, { useCreateIndex: true, useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true });

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  name:String,
  date:String,
  time:String
});
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  blogs: [blogSchema]
});
userSchema.plugin(passportLocalMongoose);

const Blog = mongoose.model("Blog", blogSchema);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

/////////////////////////////////////////////////// routes  ///////////////////////////////////////////////////

//////////////////////////////////////////// Registration and Login-Logout routes ///////////////////////////////////
app.get("/", (req, res) => {
  res.render("landing-page");
});

app.get("/register", (req, res) => {
  res.render("register", {
    user: req.user,
    failureMessage: req.flash('error')
  });
});

app.get("/login", (req, res) => {
  res.render("login", {
    user: req.user,
    failureMessage: req.flash('error')
  });
});

app.post("/register", (req, res) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.username;
  const password = req.body.password;
  User.register({ username: email, email: email, firstName: firstName, lastName: lastName }, password, function (err, user) {
    if (err) {
      res.render("register", { failureMessage: err.message });
    } else {
      passport.authenticate("local", { failureRedirect: "/register", failureFlash: { type: 'error', message: 'User already Registered.' } })(req, res, function () {
        req.flash('error');
        res.redirect("/home");
      });
    }
  });
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function (err) {
    if (err) {
      console.error(err.message);
      res.redirect("/login");
    } else {
      passport.authenticate("local", { failureRedirect: "/login", failureFlash: { type: 'error', message: 'Invalid Username or Password.' } })(req, res, function () {
        res.redirect("/home");
      });
    }
  });
});

app.get("/logout",(req,res) => {
  req.logout();
  res.redirect("/");
});

///////////////////////////////////////////////// Some Secondary Routes ///////////////////////////////////////////////////////////////
app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("about", { aboutContent: descriptions.aboutContent() });
  } else {
    res.redirect("/login");
  }
});

app.get("/contact", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("contact", { contactContent: descriptions.contactContent() });
  } else {
    res.redirect("/login");
  }
});

///////////////////////////////////////////////////// /home route ////////////////////////////////////////////////////////
app.get("/home", (req, res) => {
  if (req.isAuthenticated()) {
    Blog.find((err, foundBlogs) => {
      if (err) {
        console.log(err);
      } else {
        if (foundBlogs.length == 0) {
          const tempBlog = new Blog({
            title: "Demo Title",
            content: "demo content",
            name: "Owner",
            date: "May 7, 2020",
            time: "11:44 PM"
          });
          tempBlog.save();
          setTimeout(() => {
            res.redirect("/home");
          }, 500);
        } else {
          res.render("home", { homeStartingContent: descriptions.homeStartingContent(), posts: foundBlogs, name:req.user.firstName });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

//////////////////////////////////////// myBlogs route ///////////////////////////////////////////////
app.get("/myBlogs", (req, res) => {
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.user._id }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser.blogs.length == 0) {
          res.render("myBlogs", { posts: [] });
        } else {
          res.render("myBlogs", { posts: foundUser.blogs });
        }
      }
    })
  } else {
    res.redirect("/login");
  }
});

//////////////////////////////////////////// compose route ////////////////////////////////////////
app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }

});

app.post("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    const inputTitle = req.body.title;
    const inputContent = req.body.content;
    if (_.endsWith(inputTitle, " ") || _.startsWith(inputTitle, " ")) {
      _.trim(inputTitle);
    }
    if (_.endsWith(inputContent, " ") || _.startsWith(inputContent, " ")) {
      _.trim(inputContent);
    }

    const newBlog = new Blog({
      title: inputTitle,
      content: inputContent,
      name: req.user.firstName,
      date: dateTime.getDate(),
      time: dateTime.getTime()
    });
    newBlog.save((err) => {
      if (!err) {
        User.updateOne({ _id: req.user._id }, { $push: { blogs: newBlog } }, (err, result) => {
          if (!err) {
            res.redirect("/home");
          } else {
            console.log(err);
          }
        });
      }
    });
  } else {
    res.redirect("/login");
  }

});

////////////////////////////////////////////// blogs and their deletion routes /////////////////////////////////////
app.get("/post/:postID", (req, res) => {
  if (req.isAuthenticated()) {
    const postID = req.params.postID;
    Blog.findOne({ _id: postID }, (err, foundBlog) => {
      if (err) {
        console.log(err);
      } else {
        if (foundBlog) {
          res.render("post", { post: foundBlog });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/mypost/:postID", (req, res) => {
  if (req.isAuthenticated()) {
    const postID = req.params.postID;
    Blog.findOne({ _id: postID }, (err, foundBlog) => {
      if (err) {
        console.log(err);
      } else {
        if (foundBlog) {
          res.render("myPost", { post: foundBlog });
        }
      }
    });
  } else {
    res.redirect("/login");
  }

});

app.post("/delete/:postID", (req, res) => {
  if (req.isAuthenticated()) {
    const postID = req.params.postID;
    const userID = req.user._id;
    User.updateOne({ _id: userID }, { $pull: { blogs: { _id: postID } } }, (err) => {
      if (err) {
        console.log(err);
      } else {
        Blog.findByIdAndRemove(postID, (err) => {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/myBlogs");
          }
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
