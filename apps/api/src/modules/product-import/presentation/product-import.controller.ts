import {
  Controller,
  Get,
  Header,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessRuleError, ValidationError } from '../../../shared/domain/errors.js';
import { Role, type AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CurrentUser, Roles } from '../../../shared/presentation/decorators.js';
import { XLSX_CONTENT_TYPE } from '../../../shared/presentation/http.js';
import {
  DownloadProductImportTemplate,
  ImportProducts,
  PreviewProductImport,
} from '../application/product-import-use-cases.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Minimal shape of the multer memory-storage file this controller relies on. */
interface UploadedSpreadsheet {
  buffer: Buffer;
  originalname: string;
}

const uploadOptions = { limits: { fileSize: MAX_FILE_BYTES, files: 1 } };

function requireWorkbook(file: UploadedSpreadsheet | undefined): Buffer {
  if (!file) throw new ValidationError('An .xlsx file is required in the "file" field');
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new BusinessRuleError('INVALID_SPREADSHEET', 'Only .xlsx files are supported');
  }
  return file.buffer;
}

@Controller('products/import')
@Roles(Role.ADMIN)
export class ProductImportController {
  constructor(
    private readonly downloadTemplate: DownloadProductImportTemplate,
    private readonly previewImport: PreviewProductImport,
    private readonly importProducts: ImportProducts,
  ) {}

  @Get('template')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"')
  async template() {
    return new StreamableFile(await this.downloadTemplate.execute());
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  preview(@UploadedFile() file: UploadedSpreadsheet | undefined) {
    return this.previewImport.execute(requireWorkbook(file));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  import(
    @UploadedFile() file: UploadedSpreadsheet | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importProducts.execute(requireWorkbook(file), user.id);
  }
}
