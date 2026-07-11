import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { listRecurringAudienceLists, type IRecurringAudienceList } from '../../services/data-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createRecurringListCommand(): Command {
  const cmd = new Command('list')
    .description('List recurring audience lists for a property')
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Listing recurring audience lists...');
        spinner.start();

        const lists = await listRecurringAudienceLists(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Audience', 'State'],
          rows: lists.map((item: IRecurringAudienceList) => [item.name ?? '', item.audience ?? '', 'Unknown']),
          rowCount: lists.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
