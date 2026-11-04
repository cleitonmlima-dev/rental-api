import 'reflect-metadata';
import { loadMigrationConfig } from '../config/configuration';
import { createDataSource } from './create-data-source';

export default createDataSource(loadMigrationConfig(process.env));
