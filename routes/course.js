const mongoose = require("mongoose");
const courseSchema = mongoose.Schema({
  name: String,
  desc: String,
  type: String,
  time: String,
  discount: String,
  category: String,
  photo: String,
  instructor: String,
  syllabus: String,
  start: String,
  price: String,
  details: String,
});

module.exports = mongoose.model("course", courseSchema);
