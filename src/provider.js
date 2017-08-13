'use strict';

class Provider {

	constructor(name, params, userMapping){
		if(!name) throw new Error("Provider implementation provides no name to super constructor");

		this.name = name;
		this.params = params;
		this.userMapping = userMapping;
	}

	getHelpers(){
		return {};
	}

	async login(){
		throw new Error("Provider does not implement login()");
	}

	async token(code){
		throw new Error("Provider does not implement token()");
	}

	async profile(access_token){
		throw new Error("Provider does not implement profile()");
	}
}

class BoundProvider {
  constructor(provider){
    let params = provider.params;
    let userMapping = provider.userMapping;
    let helpers = provider.getHelpers();
    let boundHelpers = Object.keys(helpers).reduce((bound, key) => {
      bound[key] = helpers[key](params); 
      return bound;
    }, {});

    this.name = provider.name;
    this.login = provider.login.bind(boundHelpers);
    this.token = provider.token.bind(boundHelpers)
    this.profile = provider.profile.bind(boundHelpers);
    this.toUser = userMapping.toUser.bind(boundHelpers);
    this.toNewUser = userMapping.toNewUser.bind(boundHelpers);
    this.toUpdatedUser = userMapping.toUpdatedUser.bind(boundHelpers);
  }
}

module.exports.Provider = Provider;
module.exports.BoundProvider = BoundProvider