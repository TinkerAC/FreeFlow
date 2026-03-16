import { Logger } from 'winston';

export abstract class AbstractService {

  protected abstract readonly logger: Logger;

}