const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const kindergartenSchema = new Schema({
  name_en: { type: String, required: true },
  name_tc: { type: String, required: true },
  school_no: { type: String, required: true, unique: true },
  district_en: { type: String, required: true },
  district_tc: { type: String, required: true },
  organisation_en: { type: String },
  organisation_tc: { type: String },
  address_en: { type: String },
  address_tc: { type: String },
  website: { type: String },
  tel: { type: String },
  fax: { type: String },
}, {
  timestamps: true,
});

const Kindergarten = mongoose.model('Kindergarten', kindergartenSchema);

module.exports = Kindergarten; 