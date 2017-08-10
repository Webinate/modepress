﻿'use strict';

import { IResponse, IAuthenticationResponse, ILoginToken, IRegisterToken } from 'modepress';
import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import { UserManager } from '../core/users';
import { ownerRights } from '../utils/permission-controllers';
import { Controller } from './controller'
import { j200 } from '../utils/serializers';
import * as compression from 'compression';
import { error as logError } from '../utils/logger';
import { Model } from '../models/model';
import { UsersModel } from '../models/users-model';
import { IAuthOptions } from 'modepress';
import * as mongodb from 'mongodb';

/**
 * Main class to use for managing user authentication
 */
export class AuthController extends Controller {
  private _options: IAuthOptions;

	/**
	 * Creates an instance of the user manager
	 */
  constructor( options: IAuthOptions ) {
    super( [ Model.registerModel( UsersModel ) ] );
    this._options = options;
  }

  /**
 * Called to initialize this controller and its related database objects
 */
  async initialize( e: express.Express, db: mongodb.Db ) {

    if ( !this._options.accountRedirectURL )
      throw new Error( `When using an 'auth' controller, you must specifiy the 'accountRedirectURL' property. This is the url to re-direct to when a user has attempted to activate their account. The URL is appended with the query parameters 'message' and 'status' so that the response can be portrayed to the user.` );
    if ( !this._options.activateAccountUrl )
      throw new Error( `When using an 'auth' controller, you must specifiy the 'activateAccountUrl' property. This is the url sent to users when they register. The link should resolve to your {host}/auth/activate-account` );
    if ( !this._options.passwordResetURL )
      throw new Error( `When using an 'auth' controller, you must specifiy the 'passwordResetURL' property. This is the URL sent to users emails for when their password is reset. This URL should resolve to a page with a form that allows users to reset their password. The form can post to the auth/password-reset endpoint to start the process.` );


    // Setup the rest calls
    const router = express.Router();
    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.get( '/authenticated', this.authenticated.bind( this ) );
    router.get( '/logout', this.logout.bind( this ) );
    router.get( '/activate-account', this.activateAccount.bind( this ) );
    router.post( '/login', this.login.bind( this ) );
    router.post( '/register', this.register.bind( this ) );
    router.put( '/password-reset', this.passwordReset.bind( this ) );
    router.get( '/:user/resend-activation', this.resendActivation.bind( this ) );
    router.get( '/:user/request-password-reset', this.requestPasswordReset.bind( this ) );
    router.put( '/:user/approve-activation', <any>[ ownerRights, this.approveActivation.bind( this ) ] );

    // Register the path
    e.use(( this._options.rootPath || '' ) + '/auth', router );

    await super.initialize( e, db );
    return this;
  }

	/**
	 * Activates the user's account
	 */
  private async activateAccount( req: express.Request, res: express.Response ) {
    const redirectURL = this._options.accountRedirectURL;

    try {
      // Check the user's activation and forward them onto the admin message page
      await UserManager.get.checkActivation( req.query.user, req.query.key );
      res.setHeader( 'Content-Type', 'application/json' );
      res.redirect( `${redirectURL}?message=${encodeURIComponent( 'Your account has been activated!' )}&status=success&origin=${encodeURIComponent( req.query.origin )}` );

    } catch ( error ) {
      logError( error.toString() );
      res.setHeader( 'Content-Type', 'application/json' );
      res.redirect( `${redirectURL}?message=${encodeURIComponent( error.message )}&status=error&origin=${encodeURIComponent( req.query.origin )}` );
    };
  }

	/**
	 * Resends the activation link to the user
	 */
  @j200()
  private async resendActivation( req: express.Request, res: express.Response ) {
    const origin = encodeURIComponent( req.headers[ 'origin' ] || req.headers[ 'referer' ] );

    await UserManager.get.resendActivation( req.params.user, this._options.accountRedirectURL, origin );
    return { message: 'An activation link has been sent, please check your email for further instructions' } as IResponse;
  }

  /**
 * Resends the activation link to the user
 */
  @j200()
  private async requestPasswordReset( req: express.Request, res: express.Response ) {
    const origin = encodeURIComponent( req.headers[ 'origin' ] || req.headers[ 'referer' ] );
    await UserManager.get.requestPasswordReset( req.params.user, this._options.passwordResetURL, origin );
    return { message: 'Instructions have been sent to your email on how to change your password' } as IResponse;
  }

  /**
 * resets the password if the user has a valid password token
 */
  @j200()
  private async passwordReset( req: express.Request, res: express.Response ) {

    if ( !req.body )
      throw new Error( 'Expecting body content and found none' );
    if ( !req.body.user )
      throw new Error( 'Please specify a user' );
    if ( !req.body.key )
      throw new Error( 'Please specify a key' );
    if ( !req.body.password )
      throw new Error( 'Please specify a password' );

    // Check the user's activation and forward them onto the admin message page
    await UserManager.get.resetPassword( req.body.user, req.body.key, req.body.password );
    return { message: 'Your password has been reset' } as IResponse
  }

	/**
	 * Approves a user's activation code so they can login without email validation
	 */
  @j200()
  private async approveActivation( req: express.Request, res: express.Response ) {
    await UserManager.get.approveActivation( req.params.user );
    return { message: 'Activation code has been approved' } as IResponse;
  }

	/**
	 * Attempts to log the user in. Expects the username, password and rememberMe parameters be set.
	 */
  @j200()
  private async login( req: express.Request, res: express.Response ) {
    const token: ILoginToken = req.body;
    const user = await UserManager.get.logIn( token.username, token.password, token.rememberMe, req, res );

    return {
      message: ( user ? 'User is authenticated' : 'User is not authenticated' ),
      authenticated: ( user ? true : false ),
      user: ( user ? user.generateCleanedData( Boolean( req.query.verbose ) ) : {} )
    } as IAuthenticationResponse;
  }

	/**
	 * Attempts to log the user out
	 */
  @j200()
  private async logout( req: express.Request, res: express.Response ) {
    await UserManager.get.logOut( req, res );
    return { message: 'Successfully logged out' } as IResponse;
  }

	/**
	 * Attempts to register a new user
	 */
  @j200()
  private async register( req: express.Request, res: express.Response ) {
    const token: IRegisterToken = req.body;
    const activationLink = this._options.activateAccountUrl;
    const user = await UserManager.get.register( token.username!, token.password!, token.email!, activationLink, {}, req );

    return {
      message: ( user ? 'Please activate your account with the link sent to your email address' : 'User is not authenticated' ),
      authenticated: ( user ? true : false ),
      user: ( user ? user.generateCleanedData( Boolean( req.query.verbose ) ) : {} )
    } as IAuthenticationResponse;
  }

	/**
	 * Checks to see if the current session is logged in. If the user is, it will be returned redacted. You can specify the 'verbose' query parameter
	 */
  @j200()
  private async authenticated( req: express.Request, res: express.Response ) {
    const user = await UserManager.get.loggedIn( req, res );
    return {
      message: ( user ? 'User is authenticated' : 'User is not authenticated' ),
      authenticated: ( user ? true : false ),
      user: ( user ? user.generateCleanedData( Boolean( req.query.verbose ) ) : {} )
    } as IAuthenticationResponse;
  }
}