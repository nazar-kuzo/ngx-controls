import { Component, Inject, TemplateRef } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface ModalConfirmSettings<TContext = any> {
  title: string;

  buttons?: { text: string; color?: string; submit?: boolean; value?: any }[];

  template?: TemplateRef<TContext>;

  templateContext?: TContext;
}

@Component({
  selector: "modal-confirm",
  templateUrl: "./modal-confirm.component.html",
  styleUrls: ["./modal-confirm.component.scss"]
})
export class ModalConfirmComponent {

  public settings: ModalConfirmSettings;

  constructor(
    @Inject(MAT_DIALOG_DATA) public titleOrSettings: string | ModalConfirmSettings
  ) {
    if (typeof titleOrSettings == "string") {
      this.settings = { title: titleOrSettings };
    }
    else {
      this.settings = titleOrSettings;
    }

    if (!this.settings.buttons?.length) {
      this.settings.buttons = [
        { text: "No", value: false },
        { text: "Yes", value: true, submit: true, color: "primary" },
      ];
    }
  }
}
