import { AbstractEntity } from '@src/shared/domainModel/AbstractEntity';

export abstract class AbstractRecord {

  abstract toEntity(): AbstractEntity;

}