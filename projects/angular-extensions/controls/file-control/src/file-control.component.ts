import { switchMap, takeUntil } from "rxjs";
import { isEmpty } from "lodash-es";
import {
  Component, Input, ViewChild, ElementRef, OnInit, ChangeDetectorRef,
  ChangeDetectionStrategy, ContentChild, TemplateRef, Output, EventEmitter,
} from "@angular/core";

import { FilePickerAdapter, FilePickerComponent, FilePreviewModel, FileValidationTypes, ValidationError } from "ngx-awesome-uploader";

import { overrideFunction } from "angular-extensions/core";
import { ControlBase } from "angular-extensions/controls/base-control";
import { NoUploadFileService } from "./no-upload-file.service";
import { FilePickerComponentDirective } from "./ngx-awesome-uploader.directive";

export type ValidationErrorMessageTemplate = {
  [key in FileValidationTypes]: (control: FileControlComponent) => string;
};

overrideFunction(
  FilePickerComponent.prototype,
  picker => picker.dropped,
  async (_, picker, uploadEvent) => {
    let filesToUpload: File[] = [];

    for (let entry of uploadEvent.files) {
      let fileEntry = entry.fileEntry as FileSystemFileEntry;

      if (fileEntry.isFile) {
        let fileToUpload = await new Promise<File>((resolve, reject) => {
          fileEntry.file(file => resolve(file), error => reject(error));
        });

        filesToUpload.push(fileToUpload);
      }
    }

    picker.handleFiles(filesToUpload).subscribe();
  });

@Component({
  selector: "file-control",
  templateUrl: "./file-control.component.html",
  styleUrls: ["./file-control.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NoUploadFileService]
})
export class FileControlComponent extends ControlBase<File[]> implements OnInit {

  /**
   * Indicates whether you can upload single or multiple files
   */
  @Input()
  public multiple: boolean;

  /**
   * Restricts which file extensions are allowed to upload.
   * Default: any extension
   *
   * @example ['pdf', 'jpg', 'jpeg']
   */
  @Input()
  public allowedFileExtensions: string[];

  /**
   * Specifies file extension filter that would be applied during file selection.
   * Default: show all
   *
   * @example ['.pdf', '.jpg', '.jpeg']
   */
  @Input()
  public accept: string[] = [];

  /**
   * Input max file size (in MB) of selected file. Default: no limit
   */
  @Input()
  public maxFileSize: number;

  /**
   * Total max size (in MB) limit of all files. Default: no limit
   */
  @Input()
  public totalFileSize: number;

  /**
   * Max count of files in multi-upload. Default: no limit
   */
  @Input()
  public maxFilesCount: number;

  /**
   * Whether to auto upload file on file choose or not.
   * Default: false
   */
  @Input()
  public autoUpload = false;

  /**
   * Custom Adapter for uploading/removing files.
   * Default: {@link NoUploadFileService}
   */
  @Input()
  public adapter: FilePickerAdapter;

  /**
   * Whether to show default files preview container.
   * Default: false
   */
  @Input()
  public showPreview: boolean;

  @Input()
  public customErrorMessages: Partial<ValidationErrorMessageTemplate>;

  @Output()
  public fileValidationError = new EventEmitter<ValidationError>();

  @ContentChild(TemplateRef)
  public contentTemplate: TemplateRef<HTMLElement>;

  @ViewChild(FilePickerComponent)
  public filePicker: FilePickerComponent;

  private suppressControlEvents = false;

  private validationErrorMessages: ValidationErrorMessageTemplate;

  constructor(
    private elementRef: ElementRef<HTMLFieldSetElement>,
    private changeDetectorRef: ChangeDetectorRef,
    public defaultAdapter: NoUploadFileService,
  ) {
    super();

    this.adapter = this.adapter || defaultAdapter;

    this.validationErrorMessages = {
      UPLOAD_TYPE: control => control.multiple ? "Select multiple files" : "Select only one file",
      EXTENSIONS: control => `Selected file should have ${control.allowedFileExtensions} extension`,
      FILE_MAX_SIZE: control => `The size of selected file is larger than ${control.maxFileSize} MB`,
      TOTAL_MAX_SIZE: control => `The total size of selected files is larger than ${control.totalFileSize} MB`,
      FILE_MAX_COUNT: control => `Max count of files to upload should be not more than ${control.maxFilesCount}`,
      CUSTOM_VALIDATOR: _ => `There was an error while adding your file`,
    };
  }

  public ngOnInit() {
    this.singleSelectModePatch();

    if (this.customErrorMessages) {
      Object.entries(this.customErrorMessages)
        .forEach(([error, messageProvider]) => {
          this.validationErrorMessages[error as FileValidationTypes] = messageProvider;
        });
    }

    // sync files back with control value
    this.field$
      .pipe(
        switchMap(field => field.control.valueChanges),
        takeUntil(this.destroy$))
      .subscribe(files => {
        if (this.suppressControlEvents) {
          return;
        }

        this.filePicker.files = (files || []).map(file => ({ file, fileName: file.name }));

        ((this.filePicker as any).changeRef as ChangeDetectorRef).markForCheck();
      });
  }

  public getOpenFileDialogHandler(fileUploader: FilePickerComponentDirective): () => void {
    return () => {
      fileUploader.openFileDialog();

      this.elementRef.nativeElement.addEventListener(
        "focus",
        () => {
          if (this.field.control.errors) {
            Object.keys(this.field.control.errors)
              .filter(error => error.startsWith("file_"))
              .forEach(error => delete this.field.control.errors[error]);

            this.field.control.setErrors(isEmpty(this.field.control.errors) ? null : this.field.control.errors);
          }

          this.field.control.markAsTouched({ onlySelf: true });

          this.changeDetectorRef.markForCheck();
        },
        { capture: true, once: true });
    };
  }

  public onValidationError(error: ValidationError) {
    error.error = this.validationErrorMessages[error.error as FileValidationTypes](this);

    this.field.control.setErrors(Object.assign(
      {},
      this.field.control.errors || {},
      { [`file_${error.file.name}`]: error.error }));

    this.fileValidationError.emit(error);

    this.changeDetectorRef.markForCheck();
  }

  public onFileAdded(file: FilePreviewModel) {
    this.suppressControlEventsScope(() =>
      this.field.control.setValue([...(this.field.value || []), file.file as File]));

    this.changeDetectorRef.markForCheck();
  }

  public onFileRemoved(removedFile: FilePreviewModel) {
    this.suppressControlEventsScope(() =>
      this.field.control.setValue(this.field.value.filter(file => file.name != removedFile.fileName)));

    this.changeDetectorRef.markForCheck();
  }

  private suppressControlEventsScope(action: () => void) {
    this.suppressControlEvents = true;

    action();

    this.suppressControlEvents = false;
  }

  /**
   * Patches single select mode by replacing already selected file.
   */
  private singleSelectModePatch() {
    if (!this.multiple) {
      this.elementRef.nativeElement.addEventListener(
        "change",
        () => {
          this.field.control.setValue([], { emitEvent: false, emitModelToViewChange: false });

          this.filePicker.files = [];

          this.changeDetectorRef.markForCheck();
        },
        { capture: true });
    }
  }
}
