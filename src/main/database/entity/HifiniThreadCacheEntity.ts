import { BaseEntity } from '@main/database/entity/BaseEntity';

export interface HifiniThreadCacheEntityProps {
  data_href: string;
  title?: string;
  artist?: string;
  cover_src?: string;
  un_redirected_url?: string;
  cached_at?: Date;
  modified_at?: Date;
}


export class HifiniThreadCacheEntity extends BaseEntity implements HifiniThreadCacheEntityProps {
  data_href!: string;
  title?: string;
  artist?: string;
  cover_src?: string;
  un_redirected_url?: string;
  cached_at?: Date;
  modified_at?: Date;

  fromDomain(): this {
    throw new Error('This Method should not be called');
  }

  toDomain(): never {
    throw new Error('This Method should not be called');
  }


}

