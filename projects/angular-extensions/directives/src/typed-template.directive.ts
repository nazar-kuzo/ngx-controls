import { Directive, Input } from "@angular/core";

interface TemplateContext<T> {
  $implicit: T;
}

@Directive({
  selector: "ng-template[type]",
})
export class TypedTemplateDirective<T> {

  @Input()
  public type!: T;

  public static ngTemplateContextGuard<TContext>(
    dir: TypedTemplateDirective<TContext>,
    ctx: unknown
  ): ctx is TemplateContext<TContext> {
    return true;
  }
}
