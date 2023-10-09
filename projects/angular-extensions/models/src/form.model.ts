import { remove } from "lodash-es";
import { forkJoin, Observable, Subject } from "rxjs";
import { first, tap } from "rxjs/operators";
import { Injectable, OnDestroy } from "@angular/core";
import { FormGroup, AbstractControl, FormArray, ValidationErrors } from "@angular/forms";

import { Field } from "./field.model";

/**
 * Provides API to work with Form validation based on provided Fields
 */
export class Form {

  private _fields: Field<any>[] = [];
  private _editors: BaseEditor[] = [];

  public readonly destroy$ = new Subject();

  /**
   * Provides all registered fields for this form
   */
  public get fields(): Field<any>[] {
    return [...this._fields, ...this._editors.flatMap(editor => editor.form.fields)];
  }

  /**
   * Angular's Form group
   */
  public formGroup: FormGroup;

  /**
   * Indicates if Form is invalid
   */
  public get invalid() {
    return this.formGroup.invalid;
  }

  /**
   * Indicates if Form is valid
   */
  public get valid() {
    return this.formGroup.valid;
  }

  constructor(...fields: Field<any>[]) {
    this.formGroup = new FormGroup({});

    if (fields.length > 0) {
      fields.forEach(field => {
        this.addField(field);
      });

      this.formGroup.updateValueAndValidity({ onlySelf: true });
    }
  }

  /**
   * Creates Form from a {@link BaseEditor} model, based on Field properties of a model.
   * Assigns Field name based on property name of a model.
   * Enables each discovered Field property unless is explicitly disabled.
   *
   * @param model {@link BaseEditor} model
   * @returns Form
   */
  public static Create<TModel>(model: TModel, ...fieldsToIgnore: string[]) {
    let form = new Form();

    // initialize field name if missing
    Object
      .keys(model)
      .filter(key => !fieldsToIgnore.contains(key))
      .forEach(key => {
        let field = (model as any)[key];

        if (field instanceof Field && !field.name) {
          field.name = key;
        }
      });

    // add fields to form group
    Object
      .keys(model)
      .filter(key => !fieldsToIgnore.contains(key))
      .map(prop => (model as any)[prop])
      .filter(field => field instanceof Field && field.name)
      .forEach((field: Field<any>) => {
        form.addField(field);
      });

    // add nested editors to form group
    Object
      .keys(model)
      .filter(key => !fieldsToIgnore.contains(key))
      .forEach(key => {
        if ((model as any)[key] instanceof BaseEditor) {
          let editor = (model as any)[key] as BaseEditor;

          form.formGroup.addControl(key, editor.form.formGroup);

          form._editors.push(editor);
        }
      });

    form.formGroup.updateValueAndValidity({ onlySelf: true });

    return form;
  }

  /**
   * Adds Field to a Form
   *
   * @param field Field
   */
  public addField(field: Field<any>) {
    if (!field.name) {
      throw new Error("Field is missing the 'Name' property, so it cannot be used inside validation Form");
    }

    if (this.formGroup.contains(field.name)) {
      throw new Error(`Validation Form already contains the field with name '${field.name}',` +
        ` please provide unique name to make validation working properly`);
    }

    this._fields.push(field);
    this.formGroup.registerControl(field.name, field.control);

    if (!field._initialStatus?.disabled) {
      // do not emit initial value since it is known during init phase
      field.control.enable({ onlySelf: true, emitEvent: false });
    }
  }

  /**
   * Removes Field from a Form
   *
   * @param field Field
   */
  public removeField(field: Field<any>, options?: { emitEvent?: boolean }) {
    remove(this._fields, formField => formField == field);

    this.formGroup.removeControl(field.name, options);
  }

  /**
   * Marks Form and all descendants as Untouched
   */
  public markAsUntouched() {
    this.applyAction(control => {
      control.markAsUntouched({ onlySelf: true });
    });
  }

  /**
   * Marks Form and all descendants as Touched
   */
  public markAsTouched() {
    this.applyAction(control => {
      control.markAsTouched({ onlySelf: true });
    });
  }

  /**
   * Shows validation errors for all descendants
   */
  public validate() {
    this.applyAction(control => {
      control.markAsTouched({ onlySelf: true });
      control.setErrors(control.validator?.(control));
    });
  }

  /**
   * Shows validation errors for all descendants
   */
  public async validateAsync() {
    this.validate();

    let errors$ = this.getDescendants()
      .filter(control => control.errors == null && control.asyncValidator)
      .map(control => {
        let result = control.asyncValidator(control) as Observable<ValidationErrors>;

        return result.pipe(tap(errors => {
          control.setErrors(errors);
        }));
      });

    return !errors$.length ? Promise.resolve() : forkJoin(errors$)
      .pipe(first())
      .toPromise()
      .then(_ => { });
  }

  /**
   * Iterates through descendants
   */
  public applyAction(action: (control: AbstractControl) => void) {
    this.getDescendants().forEach(control => action(control));
  }

  /**
   * Iterates through descendants
   */
  public getDescendants() {
    return this.getDescendantsInternal(this.formGroup);
  }

  /**
   * Destroys each field in a form
   */
  public destroy() {
    this._fields
      .filter(field => field.destoryWith == "editor")
      .forEach(field => field.destroy());

    this._editors.forEach(editor => editor.ngOnDestroy());

    this.destroy$.next(null);
    this.destroy$.complete();
  }

  /**
   * Iterates through descendants
   */
  private getDescendantsInternal(control: AbstractControl): AbstractControl[] {
    let innerControls = control instanceof FormGroup
      ? Object.values(control.controls)
      : control instanceof FormArray
        ? control.controls
        : [];

    return [...innerControls.flatMap(innerControl => this.getDescendantsInternal(innerControl)), control];
  }
}

/**
 * Base editor model that dedicated page editors should derive from. Used by {@link Form}
 */
@Injectable()
export abstract class BaseEditor implements OnDestroy {

  public get destroy$() {
    return this.form.destroy$;
  }

  public form: Form;

  public ngOnDestroy(): void {
    this.form.destroy();
  }

  protected initialize(...fieldsToIgnore: string[]) {
    this.form = Form.Create(this, ...fieldsToIgnore);
  }
}
