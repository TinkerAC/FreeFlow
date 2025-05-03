export abstract class BaseEntity {

  abstract toDomain(): any;

  abstract fromDomain(domain: any): this;
}