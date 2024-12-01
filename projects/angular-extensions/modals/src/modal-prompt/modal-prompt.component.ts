import { NgTemplateOutlet } from "@angular/common";
import { AfterViewInit, Component, Inject, TemplateRef, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { Field, Form, ValidationConstructor } from "angular-extensions/models";

export interface ModalPromptSettings<TContext = any> {
  title: string;

  label?: string;

  validation?: ValidationConstructor<string>;

  multiline?: boolean;

  template?: TemplateRef<TContext>;

  templateContext?: TContext;
}

@Component({
  selector: "modal-prompt",
  templateUrl: "./modal-prompt.html",
})
export class ModalPromptComponent implements AfterViewInit {

  @ViewChild(NgTemplateOutlet, { static: true })
  public templateOutlet: NgTemplateOutlet;

  public form: Form;
  public field?: Field<any>;

  constructor(
    public dialogRef: MatDialogRef<ModalPromptComponent, string>,
    @Inject(MAT_DIALOG_DATA) public settings: ModalPromptSettings
  ) {
    this.form = new Form();

    this.field = new Field<string>({
      label: this.settings.label || this.settings.title,
      name: "Answer",
      validation: this.settings.validation,
    });
  }

  public ngAfterViewInit(): void {
    // hacky way to get control [field] input
    this.field = (this.templateOutlet as any)._viewRef._lView
      .find((item: any) => item instanceof Field) as Field<any>;

    if (this.field) {
      this.form.addField(this.field);
    }
  }

  public submit() {
    this.form.validate();

    if (this.form.valid) {
      this.dialogRef.close(this.field?.value);
    }
  }
}
