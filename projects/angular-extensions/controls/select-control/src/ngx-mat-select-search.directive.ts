import { Directive, Input, AfterViewInit, OnChanges, ElementRef } from "@angular/core";
import { MatSelect } from "@angular/material/select";
import { MatSelectSearchComponent } from "ngx-mat-select-search";

import { overrideFunction, SimpleChanges } from "angular-extensions/core";
import { filter, first } from "rxjs";

@Directive({
  selector: "ngx-mat-select-search"
})
export class MatSelectSearchComponentDirective implements AfterViewInit, OnChanges {

  private get innerSearchElement() {
    return this.selectSearchComponent.innerSelectSearch.nativeElement as HTMLElement;
  }

  private get checkbox() {
    return this.innerSearchElement.querySelector("mat-checkbox") as HTMLElement;
  }

  private get searchIcon() {
    return this.innerSearchElement.querySelector("mat-icon") as HTMLElement;
  }

  @Input()
  public toggleAllCheckboxDisabled: boolean;

  constructor(
    matSelect: MatSelect,
    elementRef: ElementRef<HTMLElement>,
    private selectSearchComponent: MatSelectSearchComponent,
  ) {
    fixSearchWidthCalculation();

    /**
     * Select search has position absolute and re-calculates width when opened which causes flicker
     */
    function fixSearchWidthCalculation() {
      matSelect.openedChange
        .pipe(filter(opened => opened), first())
        .subscribe(() => elementRef.nativeElement.classList.toggle("position-relative", true));

      overrideFunction(
        selectSearchComponent,
        searchComponent => searchComponent.updateInputWidth,
        updateInputWidth => {
          updateInputWidth();

          elementRef.nativeElement.classList.toggle("position-relative", false);
        });
    }
  }

  public ngAfterViewInit(): void {
    if (this.checkbox) {
      this.checkbox.insertAdjacentHTML("afterend", `<mat-icon
        class="material-icons"
        style="padding-left: 12px; margin-right: -4px; display: none; color: #999;"
        >search</mat-icon>`);

      this.updateCheckboxState();
    }
  }

  public ngOnChanges(changes: SimpleChanges<MatSelectSearchComponentDirective>): void {
    if (changes.toggleAllCheckboxDisabled) {
      this.updateCheckboxState();
    }
  }

  private updateCheckboxState() {
    if (!this.checkbox) {
      return;
    }

    this.checkbox.style.display = this.toggleAllCheckboxDisabled ? "none" : null;
    this.searchIcon.style.display = this.toggleAllCheckboxDisabled ? null : "none";
  }
}
