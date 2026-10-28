import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { z } from 'zod';
import { XLSX_CONTENT_TYPE } from '../../../shared/presentation/http.js';
import { idParam, queryBoolean } from '../../../shared/presentation/schema-helpers.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  ExportReorderSuggestions,
  GetReorderSuggestions,
} from '../application/use-cases/reorder-use-cases.js';

const reorderQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: idParam.optional(),
  equipmentId: idParam.optional(),
  onlyOutOfStock: queryBoolean.optional(),
});
type ReorderQuery = z.infer<typeof reorderQuerySchema>;

@Controller('reorder')
export class ReorderController {
  constructor(
    private readonly getSuggestions: GetReorderSuggestions,
    private readonly exportSuggestions: ExportReorderSuggestions,
  ) {}

  @Get('suggestions')
  suggestions(@Query(new ZodValidationPipe(reorderQuerySchema)) query: ReorderQuery) {
    return this.getSuggestions.execute(query);
  }

  @Get('export')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="reposicion.xlsx"')
  async export(@Query(new ZodValidationPipe(reorderQuerySchema)) query: ReorderQuery) {
    return new StreamableFile(await this.exportSuggestions.execute(query));
  }
}
