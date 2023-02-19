const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/majorproject");
const plm = require("passport-local-mongoose");
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,

    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: Number,
    default: 0,
  },
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
    },
  ],
  purchasedItems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
    },
  ],
  profilePic: {
    type: String,
    default: "def.jpg",
  },
  expireAt: Date,
  otp: String,
  addressline1: {
    type: String,
  },
  addressline2: {
    type: String,
  },
  Pincode: {
    type: Number,
  },
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  mobile: {
    type: Number,
  },
});

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);
