import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CustomPaginatorDirective } from "./custom-paginator.directive";
import { FormatDirective } from "./format.directive";
import { MatEnhancedTooltipDirective } from "./mat-enhanced-tooltip.directive";
import { PreventClickOnSelectionDirective } from "./prevent-click-on-selection.directive";
import { MatCellDefDirective, MatRowDefDirective } from "./mat-cell-def.directive";
import { NgForDirective } from "./ng-for.directive";
import { CdkVirtualForOfDirective } from "./cdk-virtual-for.directive";
import { NgLetDirective } from "./ng-let.directive";
import { TypedTemplateDirective } from "./typed-template.directive";

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    CustomPaginatorDirective,
    FormatDirective,
    MatEnhancedTooltipDirective,
    PreventClickOnSelectionDirective,
    MatCellDefDirective,
    MatRowDefDirective,
    NgForDirective,
    CdkVirtualForOfDirective,
    NgLetDirective,
    TypedTemplateDirective,
  ],
  exports: [
    CommonModule,

    CustomPaginatorDirective,
    FormatDirective,
    MatEnhancedTooltipDirective,
    PreventClickOnSelectionDirective,
    MatCellDefDirective,
    MatRowDefDirective,
    NgForDirective,
    CdkVirtualForOfDirective,
    NgLetDirective,
    TypedTemplateDirective,
  ]
})
export class NgxDirectivesModule { }
