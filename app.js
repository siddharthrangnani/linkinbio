const express = require("express");
const app = express();
const shortId = require("shortid");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const port = 3000;

const session = require("express-session");
const passport = require("passport");
const multer = require("multer");
const flash = require("express-flash");
const { body, validationResult } = require("express-validator");
const { check } = require("express-validator");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require("path");
var fs = require('fs');

const { render } = require("ejs");
const { exec } = require("child_process");
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
mongoose.connect("mongodb://localhost/finproject", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(bodyParser.json());
mongoose.set("useCreateIndex", true);
const linksSchema = new mongoose.Schema({
  linkTitle: {
    type: String,
  },
  linkUrl: {
    type: String,
  },
});
const socialSchema = new mongoose.Schema({
  instagram: {
    type: String,
    max: 1,
  },
  facebook: {
    type: String,
    max: 1,
  },
  snapchat: {
    type: String,
    max: 1,
  },
  twitter: {
    type: String,
    max: 1,
  },
});
const jetlinksSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  password: String,
  email: {
    type: String,
  },


  backgroundColor: String,
  barColor: String,
  font: String,
  links: [linksSchema],
  social: [socialSchema],
});
const shortUrlSchema = new mongoose.Schema({
  full: {
    type: String,
    required: true,
  },
  short: {
    type: String,
    required: true,
    default: shortId.generate,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
});

jetlinksSchema.plugin(passportLocalMongoose);
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);
const Model = mongoose.model("Model", jetlinksSchema);
const linkModel = mongoose.model("linkModel", linksSchema);
const socialModel = mongoose.model("socialModel", socialSchema);

passport.use(Model.createStrategy());

passport.serializeUser(Model.serializeUser());
passport.deserializeUser(Model.deserializeUser());

app.get("/", function (req, res) {
  res.render("index");
});
app.post(
  "/register",
  body("password")
    .isLength({
      min: 8,
    })
    .withMessage("password should be atleast 8 characters long"),
  body("username")
    .isLength({
      min: 3,
    })
    .withMessage("username should be 3 characters long"),
  function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("register", {
        errors: errors.array(),
      });
    }

    Model.register(
      {
        username: req.body.username,
      },
      req.body.password,
      function (err, user) {
        if (user) {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/admin");
          });
        } else {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.render("register", {
              errors: errors.array(),
            });
          }
        }
      }
    );
  }
);
app.get("/pro",function(req,res){
res.render("pro");
});
app.post(
  "/login",
body("username")
  .isLength({
    min: 2,
  }).withMessage("username should be 3 characters long"),
  passport.authenticate("local", {failureRedirect: '/login',failureFlash: true
  }),
  function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("login", {
        errors: errors.array(),
      });
    }
    const user = new Model({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.render("login", {
              errors: errors.array(),
            });
          }
      } else {
        passport.authenticate("local",)(req, res, function () {
          res.redirect("/admin");
        });
      }
    });
  }
);
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
  
});
app.get("/support", function (req, res) {
  res.redirect("https://sidcodes.tech/support");
});
app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res,) {
  res.render("register", {
    
  });
});


app.get("/analytics", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("analytics");
  } else {
    res.redirect("/login");
  }
});
app.get("/appearance", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("appearance");
  } else {
    res.redirect("/login");
  }
});
// Step 5 - set up multer for storing uploaded files



var storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads')
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + '-' + Date.now())
	}
});

var upload = multer({ storage: storage });

app.post("/appearance", function (req, res) {
  if (req.isAuthenticated()) {
    const bgColor = req.body.bgColor;
    const font = req.body.fontColor;
    const query = req.user.username;
    const barColor = req.body.barColor;
    
    Model.findOneAndUpdate(
      query,
      { backgroundColor: bgColor, font: font ,barColor: barColor},
      function (err, res) {
      console.log(res)}
    );
  
    res.redirect("/admin");
  }
});
app.get("/admin", function (req, res) {
  if (req.isAuthenticated()) {
    Model.findOne({ username: req.user.username })
      .populate("links", "linkUrl", "linkTitle")
      .exec(function (err, foundlist) {
        if (!err) {
          res.render("admin", {
            linkTitle: foundlist.links,
            linkUrl: foundlist.links,
            username: foundlist.username
            
          });
        } else {
          res.send("redirect to home page and then login");
          res.redirect("/login");
        }
      });
  } else {
    res.redirect("/login");
  }
});
app.post("/admin", function (req, res) {
  if (req.isAuthenticated()) {
    Model.findOne({ username: req.user.username }).exec(function (
      err,
      foundList
    ) {
      if (foundList) {
        const list = new linkModel({
          linkTitle: req.body.linkTitle,
          linkUrl: req.body.linkUrl,
        });
        
        foundList.links.push(list);
          foundList.save();
  
        res.redirect("/admin");
      } else {
        res.send("redirect to home page and then login");
        res.redirect("/login");
      }
    });
   
  }
  
});
app.get("/:username", function (req, res) {
  const username = req.params.username;
  Model.findOne({ username: username }).exec(function (err, foundlist) {
    if (foundlist) {
      res.render("output", {
        linkTitle: foundlist.links,
        linkUrl: foundlist.links,
        mainName: username,
        BgColor: foundlist.backgroundColor,
        fontColor: foundlist.font,
        barColor : foundlist.barColor,
        instagram: foundlist.social,
            facebook: foundlist.social,
            snapchat: foundlist.social,
            twitter: foundlist.social,
          
      });
      
    } else {
      console.log(foundlist);
    }
  });
 
});
app.post("/social",function(req,res){
  if (req.isAuthenticated()) {
    Model.findOne({ username: req.user.username }).exec(function (
      err,
      foundList
    ) {
      if (foundList) {
       
        const social = new socialModel({
          twitter : req.body.twitter,
          facebook : req.body.facebook,
          snapchat : req.body.snapchat,
          instagram : req.body.instagram
        });
        
        foundList.social.push(social);
          foundList.save();
  
        res.redirect("/admin");
      } else {
        res.send("redirect to home page and then login");
        res.redirect("/login");
      }
    });
   
  }
 
});

app.post("/delete", function (req, res) {
  const delItem = req.body.checkbox;
  if (req.isAuthenticated()) {
    Model.findOneAndUpdate(
      { username: req.user.username },
      { $pull: { links: { _id: delItem } } },
      function (err, foundList) {
        if (foundList) {
          console.log(foundList);
          res.redirect("/admin");
        }
      }
    );
  }
});

app.get('/shortner', async (req, res) => {
  const shortUrls = await ShortUrl.find()
  res.render('shortner', { shortUrls: shortUrls })
})

app.post('/shortUrls', async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl })

  res.redirect('/shortner');
});

app.get('/short/:shortUrl', async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl })
  if (shortUrl == null) return res.sendStatus(404)

  shortUrl.clicks++
  shortUrl.save()

  res.redirect(shortUrl.full)
});

app.listen(port, function () {
  console.log("server is running");
});
