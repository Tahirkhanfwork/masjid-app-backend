const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const passport = require('passport');
const Masjid = require('../models/masjid.model');
const JWT_SECRET = process.env.JWT_SECRET;

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      // Use your model's findById
      const masjid = await Masjid.findById(jwt_payload.id);
      if (masjid) {
        return done(null, masjid);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;
