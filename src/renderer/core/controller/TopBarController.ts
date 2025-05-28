import { AbstractController } from '@renderer/core/controller/AbstractController';

export class TopBarController extends AbstractController<[]> {
  protected getCurrentStateForSubscriber(): [] {
    return [];
  }


}