import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { SelectionModel } from "@angular/cdk/collections";
import { MatPseudoCheckboxModule } from "@angular/material/core";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { overrideFunction } from "angular-extensions/core";
import { NgxDirectivesModule } from "angular-extensions/directives";
import { NgxBaseControlModule } from "angular-extensions/controls/base-control";
import { SelectControlComponent } from "./select-control.component";
import { CustomMatOptionDirective } from "./custom-mat-option.directive";
import { MatSelectSearchComponentDirective } from "./ngx-mat-select-search.directive";

interface AppSelectionModel<T> extends Omit<SelectionModel<T>, "_markSelected" | "_unmarkSelected"> {
  _markSelected(value: T): void;

  _unmarkSelected(value: T): void;
}

function patchSelectionModel() {
  overrideFunction(
    SelectionModel.prototype as any as AppSelectionModel<any>,
    selection => selection._markSelected,
    (markSelected, selection, value) => markSelected(tryGetConcreteValue(selection, value)));

  overrideFunction(
    SelectionModel.prototype as any as AppSelectionModel<any>,
    selection => selection._unmarkSelected,
    (unmarkSelected, selection, value) => unmarkSelected(tryGetConcreteValue(selection, value)));

  function tryGetConcreteValue<T>(selection: AppSelectionModel<T>, value: T) {
    if (!selection.compareWith) {
      return value;
    } else {
      for (let selectedValue of selection.selected) {
        if (selection.compareWith(selectedValue, value)) {
          return selectedValue;
        }
      }
      return value;
    }
  }
}

patchSelectionModel();

@NgModule({
  imports: [
    CommonModule,
    MatSelectModule,
    MatPseudoCheckboxModule,
    MatProgressSpinnerModule,
    ScrollingModule,
    NgxMatSelectSearchModule,

    NgxBaseControlModule,
    NgxDirectivesModule,
  ],
  exports: [
    MatSelectModule,
    MatProgressSpinnerModule,
    NgxBaseControlModule,
    ScrollingModule,
    NgxMatSelectSearchModule,

    SelectControlComponent,
    NgxDirectivesModule,
  ],
  declarations: [
    SelectControlComponent,
    CustomMatOptionDirective,
    MatSelectSearchComponentDirective,
  ]
})
export class NgxSelectControlModule { }
