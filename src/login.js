'use strict';

const jwt           = require('jsonwebtoken');
const BoundProvider = require('./provider').BoundProvider;

const defaultConfig = {
  jwt: {
    secret: null,
    options: {
      expiresIn: 90 * 24 * 60 * 60 /* 90 days */,
      algorithm: "HS512",
    },
  },
  redirectURL: "/success?user=",
  failureURL: '/login'
}

class Login {
  constructor(config, providers){
    this.config = Object.assign({}, defaultConfig, config);

    if(!this.config.jwt.secret) throw new Error("Login requires jwt.secret to be defined (no default value)");

    this.providers = providers.map(provider => new BoundProvider(provider));

    this.mount = router => {
      this.providers.forEach(provider => {
        router.get(`/login/${provider.name}`,          this.login(provider));
        router.get(`/login/${provider.name}/callback`, this.callback(provider));
      });
    }
  }

  jwtSign(toSign){
    return jwt.sign(toSign, this.config.jwt.secret, this.config.jwt.options);
  }

  getRedirectURL(token, user){
    return this.config.redirectURL + encodeURIComponent(JSON.stringify({token: token, user: user}));
  }
  
  getFailureURL(){
    return this.config.failureURL;
  }

  login(provider){
    return async (ctx, next) => {
      console.log(`${provider.name} login`);
      ctx.redirect(await provider.login());
    };
  }

  callback(provider){
    return async (ctx, next) => {
      console.log(`${provider.name} callback`);
      if(ctx.query.error) {
        console.log(`${provider.name} callback error ${ctx.query.error}`);
        ctx.redirect(this.getFailureURL());
        return;
      }

      let token = await provider.token(ctx.query.code);
      if(!token.access_token){
        console.log(`${provider.name} token error`);
        ctx.redirect(this.getFailureURL());
        return
      }

      let profile = await provider.profile(token.access_token);

      console.log(`${provider.name} profile: ${JSON.stringify(profile)}`)

      let user = await provider.toUser(profile);
      if(!user){
        let results = await provider.toNewUser(profile);
        user = results.toObject({depopulate: true});
        console.log(`New user: ${JSON.stringify(user)} from: ${provider.name} profile.`);
      }else{
        let results = await provider.toUpdatedUser(profile, user);
        user = results.toObject({depopulate: true});
        console.log(`Current User: ${JSON.stringify(user)} updated from ${provider.name} profile.`);
      }

      let returnToken = this.jwtSign(user);
      ctx.redirect(this.getRedirectURL(returnToken, user));
    }
  }
}

module.exports = Login;