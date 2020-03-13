﻿import { IConfig } from '../types/config/i-config';
import { Page } from '../types/tokens/standard-tokens';
import { Db, ObjectID, Collection } from 'mongodb';
import Controller from './controller';
import ModelFactory from '../core/model-factory';
import { ITemplate } from '../types/models/i-template';

export type GetOptions = {
  id: string;
  user: string;
  identifier: string;
  name: string;
};

/**
 * Class responsible for managing templates
 */
export class TemplatesController extends Controller {
  private _templates: Collection<ITemplate<'server'>>;

  constructor(config: IConfig) {
    super(config);
  }

  /**
   * Initializes the controller
   * @param db The mongo db
   */
  async initialize(db: Db) {
    this._templates = ModelFactory.get('templates').collection;
    return this;
  }

  /**
   * Fetches all templates
   */
  async getMany() {
    const templatesModel = this._templates;

    // Save the new entry into the database
    const responses = await Promise.all([templatesModel.count({}), templatesModel.find({}, undefined, 0).toArray()]);
    const [count, templates] = responses;

    const toRet: Page<ITemplate<'server'>> = {
      limit: -1,
      count: count,
      index: 0,
      data: templates
    };

    return toRet;
  }

  /**
   * Gets a template by its name or ID
   */
  async get(id: string | ObjectID) {
    const templateModel = this._templates;
    const searchQuery: Partial<ITemplate<'server'>> = {
      _id: new ObjectID(id)
    };
    const result = await templateModel.findOne(searchQuery);

    if (!result) return null;
    else return result;
  }
}
