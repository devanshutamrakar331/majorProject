var express = require("express");
const passport = require("passport");
var router = express.Router();
const usermodel = require("./users");
const localStrategy = require("passport-local");
const { v4 } = require("uuid");
const multer = require("multer");
const category = require("./category");
const course = require("./course");
const { check } = require("express-validator");
const { validationResult } = require("express-validator");
const mailer = require("../nodemailer");
const bcrypt = require("bcrypt");

const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_p30PjErOv8aRr0",
  key_secret: "45MVHPIVoAmkUgLdfXC6WIJP",
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/files/");
  },
  filename: function (req, file, cb) {
    const fn = v4() + file.originalname;
    cb(null, fn);
  },
});

const upload = multer({ storage: storage });
passport.use(
  new localStrategy({ usernameField: "email" }, usermodel.authenticate())
);

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});
router.get("/signup", loginRedirect, function (req, res, next) {
  const errors = null;
  res.render("signup", { errors });
});
router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  const categories = await category.find();
  const courses = await course.find();
  var shortname = "";
  user.name.split(" ").forEach(function (e) {
    shortname += e.slice(0, 1);
  });
  res.render("profile", { user, categories, courses, shortname });
});
router.get("/courses", loginRedirect, async function (req, res) {
  const user = null;
  const categories = await category.find();
  const courses = await course.find();
  // res.json({ courses });
  res.render("profile", { user, categories, courses });
});
router.get("/login", loginRedirect, function (req, res, next) {
  res.render("login", function (err, html) {
    res.send(html);
  });
});
router.get("/courses/:categoryname", async function (req, res) {
  const user = null;
  const categories = await category.find();
  const courses = await course.find({ category: req.params.categoryname });

  res.render("profile", { courses, user, categories });
});
router.get("/course/:coursename", loginRedirect, async function (req, res) {
  const currentCourse = await course.findOne({ name: req.params.coursename });
  console.log(currentCourse);
  const user = null;
  res.render("viewCourse", { currentCourse, user });
});
router.get("/account/profile", async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  var shortname = "";
  user.name.split(" ").forEach(function (e) {
    shortname += e.slice(0, 1);
  });
  res.render("myaccount", { user, shortname });
});
router.get(
  "/profile/course/:coursename",
  isLoggedIn,
  async function (req, res) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });
    var shortname = "";
    user.name.split(" ").forEach(function (e) {
      shortname += e.slice(0, 1);
    });
    const currentCourse = await course.findOne({ name: req.params.coursename });

    res.render("viewCourse", { currentCourse, user, shortname });
  }
);
router.get("/addtocart/:id", isLoggedIn, async function (req, res) {
  const currentCourse = await course.findOne({ _id: req.params.id });
  const user = await usermodel.findOne({
    username: req.session.passport.user,
  });
  user.cart.push(currentCourse._id);
  console.log(currentCourse);
  await user.save();
  res.redirect(req.headers.referer);
});
router.get("/totalprice", async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  const cart = await user.populate("cart");
  res.json({
    cart: cart.cart,
  });
});
router.get("/removefromcart/:id", isLoggedIn, async function (req, res) {
  const currentCourse = await course.findOne({ _id: req.params.id });
  const user = await usermodel.findOne({ username: req.session.passport.user });
  user.cart.remove(currentCourse._id);
  await user.save();

  res.redirect(req.headers.referer);
});
router.get("/profile/cart", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  var shortname = "";
  user.name.split(" ").forEach(function (e) {
    shortname += e.slice(0, 1);
  });
  const cart = await user.populate("cart");
  res.render("cart", { user, cart: cart.cart, shortname });
});

// User Authentication Route
router.post(
  "/register",
  [
    check("email")
      .isEmail()
      .withMessage("Email address is invalid")
      .custom((email) => {
        return usermodel.findOne({ email: email }).then((user) => {
          if (user) {
            return Promise.reject("Email address is already exits");
          }
        });
      }),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must be of 8 characters"),
  ],
  function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("signup", { errors: errors.array() });
    }

    const newuser = new usermodel({
      name: req.body.name,
      username: req.body.email,
      email: req.body.email,
      password: req.body.password,
    });
    usermodel
      .register(newuser, req.body.password)
      .then((registeredUser) => {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/profile");
        });
      })
      .catch((err) => {});
  }
);

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  })
);
router.get("/logout", function (req, res) {
  req.logOut(function (err) {
    if (err) throw err;
    else {
      res.redirect("/courses");
    }
  });
});

router.get("/resetpassword/:id/?key", function (req, res) {
  usermodel.findOne({ otp: req.query.code }).then((user) => {
    const today = new Date();
    if (today.getTime() < user.expireAt.getTime()) {
      req.profile = user;
      res.render("resetpassword", { user: req.params.id });
    } else {
      res.send("Link is invalid");
    }
  });
});

router.post("/resetpassword/:id", function (req, res) {
  usermodel
    .findById(req.params.id)
    .then((user) => {
      user.setPassword(req.body.newpassword).then((setuser) => {
        setuser.save();
        req.flash("message", "Password Reset Successfully");
        res.redirect("/login");
        console.log("password reset successfully");
      });
    })
    .catch((err) => console.log("not able to reset password"));
});

router.post("/sendforgotpasswordmail", function (req, res) {
  usermodel.findOne({ username: req.body.email }).then((user) => {
    if (!user) {
      req.flash("message", "Account with this email address does not exist ");
      return res.redirect("back");
    }
    const today = new Date();
    const tommorrow = new Date(today);
    tommorrow.setDate(today.getDate() + 1);
    const otp = Math.floor(Math.random() * 1000000);
    user.expireAt = tommorrow;
    user.otp = otp;
    user.save();
    const data = `Hello ${user.name} , your Reset password verification code is ${user.otp} valid till 24 hours from now and reset link is http://localhost:3000/resetpassword/${user._id}/key?code=${user.otp}`;
    mailer(user.email, data)
      .then((mail) => {
        console.log("mail sent");
        req.flash(
          "message",
          "Reset password link sent to your registered email address please check your email inbox"
        );
        res.redirect("back");
      })
      .catch((err) => console.log(err));
  });
});

// router.get("/enterotp", function (req, res) {
//   res.render("enterotp", { message: req.flash("message") });
// });

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}
function loginRedirect(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect("/profile");
  } else {
    return next();
  }
}
// Admin Authentication Route
router.post(
  "/adminlogin",
  passport.authenticate("local", {
    successRedirect: "/adminDashboard",
    failureRedirect: "/adminlogin",
  }),
  function () {}
);

router.get("/forgotpassword", function (req, res) {
  res.render("resetenteremail", { message: req.flash("message") });
});

router.get("/adminlogin", function (req, res) {
  res.render("adminAuth");
});
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 1) {
    return next();
  } else {
    res.redirect("/adminlogin");
  }
}

// Admin Routes
router.get("/adminDashboard", isAdmin, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  res.render("adminDashboard", { user });
});
router.post(
  "/adminphoto",
  upload.single("adminImage"),
  async function (req, res, next) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });
    user.profilePic = `${req.file.filename}`;
    await user.save();
    console.log(user.profilePic);
    res.redirect(req.headers.referer);
  }
);
router.post(
  "/userphoto",
  upload.single("userdp"),
  async function (req, res, next) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });
    user.profilePic = `${req.file.filename}`;
    await user.save();
    res.redirect(req.headers.referer);
  }
);
router.post("/changepassword/:id", function (req, res) {
  usermodel.findOne({ _id: req.params.id }).then((user) => {
    bcrypt.hash(req.body.oldpassword, user.salt).then((hashuser) => {
      if (hashuser === user.hash) {
        console.log("true");
      } else {
        console.log("false");
      }
    });
  });
});
router.get("/account/settings", async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  var shortname = "";
  user.name.split(" ").forEach(function (e) {
    shortname += e.slice(0, 1);
  });
  res.render("settings", { user, shortname });
});
// Admin Categoires Route
router.get("/adminDashboard/categories", isAdmin, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  category.find().then((category) => {
    res.render("adminCategory", {
      user,
      category,
      message: req.flash("message"),
    });
  });
});
router.get("/adminDashboard/categories/delete/:id", function (req, res) {
  category.findOneAndDelete({ _id: req.params.id }).then((deleted) => {
    req.flash("message", "Category has been deleted");

    res.redirect("back");
  });
});
router.post("/addcategory", isAdmin, function (req, res) {
  category
    .create({
      name: req.body.category,
    })
    .then((create) => {
      console.log("category added");
      create.save();
      req.flash("message", "Category has been created");
      res.redirect("back");
    });
});

// Admin Courses Route
router.get("/adminDashboard/courses", isAdmin, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  // const category = await category.find();
  const categories = await category.find();
  const courses = await course.find();
  res.render("adminCourses", { user, categories, courses });
});
router.get(
  `/adminDashboard/courses/:coursename`,
  isAdmin,
  async function (req, res) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });

    const currentCourse = await course.findOne({ name: req.params.coursename });
    // const category = await category.find();
    res.render("adminReadCourse", { user, currentCourse });
  }
);
router.get(
  `/adminDashboard/courses/edit/:coursename`,
  isAdmin,
  async function (req, res) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });

    const currentCourse = await course.findOne({ name: req.params.coursename });
    const categories = await category.find();
    console.log(currentCourse.photo);
    res.render("adminCourseUpdate", { user, currentCourse, categories });
  }
);
router.post(
  `/adminDashboard/courses/update/:coursename`,
  upload.single("coursephoto"),
  isAdmin,
  async function (req, res) {
    const user = await usermodel.findOne({
      username: req.session.passport.user,
    });
    const currentCourse = await course.findOneAndUpdate(
      { name: req.params.coursename },
      {
        name: req.body.coursename,
        price: req.body.courseprice,
        start: req.body.coursestart,
        syllabus: req.body.coursesyllabus,

        time: req.body.coursetime,
        discount: req.body.coursediscount,
        instructor: req.body.courseinstructor,
        type: req.body.coursetype,
        details: req.body.coursedetails,
        category: req.body.coursecategory,
        desc: req.body.coursedesc,
      },
      { new: true }
    );
    currentCourse.photo = `${req.file.filename}`;
    await currentCourse.save();
    res.redirect("/adminDashboard/courses");
  }
);
router.get(
  "/adminDashboard/courses/delete/:id",
  isAdmin,
  async function (req, res) {
    const deletedCourse = await course.findByIdAndDelete({
      _id: req.params.id,
    });
    res.redirect(req.headers.referer);
  }
);
router.post(
  "/addcourse",
  isAdmin,
  upload.single("coursephoto"),
  async function (req, res) {
    const newCourse = await course.create({
      name: decodeURI(req.body.coursename),
      price: req.body.courseprice,
      start: req.body.coursestart,
      time: req.body.coursetime,
      type: req.body.coursetype,
      syllabus: req.body.coursesyllabus,
      discount: req.body.coursediscount,
      instructor: req.body.courseinstructor,
      details: req.body.coursedetails,
      category: decodeURI(req.body.coursecategory),
      desc: req.body.coursedesc,
    });
    newCourse.photo = `${req.file.filename}`;
    await newCourse.save();
    res.redirect(req.headers.referer);
  }
);

router.post("/create/orderId", (req, res) => {
  console.log("create order request", req.body);
  var options = {
    amount: req.body.amount, // amount in the smallest currency unit
    currency: "INR",
    receipt: "order_rcptid_11",
  };
  instance.orders.create(options, function (err, order) {
    console.log(order);
  });
});

module.exports = router;
