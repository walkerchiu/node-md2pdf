import {
  ApplicationServices,
  APPLICATION_SERVICE_NAMES,
} from '../../../src/application/container';

describe('ApplicationServices Integration', () => {
  describe('Service Container Creation', () => {
    it('should create container with all services registered', () => {
      const container = ApplicationServices.createContainer();

      // Check that all application services are registered
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
      ).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER),
      ).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.TOC_GENERATOR),
      ).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR),
      ).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR),
      ).toBe(true);

      // Check that infrastructure services are also registered
      expect(container.isRegistered('logger')).toBe(true);
      expect(container.isRegistered('errorHandler')).toBe(true);
      expect(container.isRegistered('config')).toBe(true);
      expect(container.isRegistered('fileSystem')).toBe(true);
      expect(container.isRegistered('translator')).toBe(true);
    });

    it('should resolve application services successfully', () => {
      const container = ApplicationServices.createContainer();

      expect(() =>
        container.resolve(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
      ).not.toThrow();
      expect(() =>
        container.resolve(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER),
      ).not.toThrow();
      expect(() =>
        container.resolve(APPLICATION_SERVICE_NAMES.TOC_GENERATOR),
      ).not.toThrow();
      expect(() =>
        container.resolve(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR),
      ).not.toThrow();
      expect(() =>
        container.resolve(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR),
      ).not.toThrow();
    });

    it('should create services as singletons', () => {
      const container = ApplicationServices.createContainer();

      const service1 = container.resolve(
        APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
      );
      const service2 = container.resolve(
        APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
      );

      expect(service1).toBe(service2);
    });
  });

  describe('Factory Methods', () => {
    it('should create PDF generator service', () => {
      const service = ApplicationServices.createPDFGeneratorService();
      expect(service).toBeDefined();
      expect(typeof service.generatePDF).toBe('function');
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.cleanup).toBe('function');
    });

    it('should create Markdown parser service', () => {
      const service = ApplicationServices.createMarkdownParserService();
      expect(service).toBeDefined();
      expect(typeof service.parseMarkdown).toBe('function');
      expect(typeof service.parseMarkdownFile).toBe('function');
      expect(typeof service.extractHeadings).toBe('function');
      expect(typeof service.validateMarkdown).toBe('function');
    });

    it('should create TOC generator service', () => {
      const service = ApplicationServices.createTOCGeneratorService();
      expect(service).toBeDefined();
      expect(typeof service.generateTOC).toBe('function');
      expect(typeof service.generateTOCWithPageNumbers).toBe('function');
      expect(typeof service.estimatePageNumbers).toBe('function');
      expect(typeof service.validateHeadings).toBe('function');
    });

    it('should create file processor service', () => {
      const service = ApplicationServices.createFileProcessorService();
      expect(service).toBeDefined();
      expect(typeof service.processFile).toBe('function');
      expect(typeof service.validateInputFile).toBe('function');
      expect(typeof service.generateOutputPath).toBe('function');
    });

    it('should create batch processor service', () => {
      const service = ApplicationServices.createBatchProcessorService();
      expect(service).toBeDefined();
      expect(typeof service.processBatch).toBe('function');
      expect(typeof service.validateBatchConfig).toBe('function');
      expect(typeof service.estimateBatchSize).toBe('function');
      expect(typeof service.generateProgressCallback).toBe('function');
    });
  });

  describe('Service Names Constants', () => {
    it('should provide correct service name constants', () => {
      expect(APPLICATION_SERVICE_NAMES.PDF_GENERATOR).toBe('pdfGenerator');
      expect(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER).toBe('markdownParser');
      expect(APPLICATION_SERVICE_NAMES.TOC_GENERATOR).toBe('tocGenerator');
      expect(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR).toBe('fileProcessor');
      expect(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR).toBe('batchProcessor');
    });
  });

  describe('Configured Container', () => {
    it('should create configured container with custom config', () => {
      const customConfig = {
        pdf: { format: 'Letter' },
        toc: { maxDepth: 2 },
      };

      const container =
        ApplicationServices.createConfiguredContainer(customConfig);

      expect(container.isRegistered('config')).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
      ).toBe(true);
    });

    it('should create configured container without custom config', () => {
      const container = ApplicationServices.createConfiguredContainer();

      expect(container.isRegistered('config')).toBe(true);
      expect(
        container.isRegistered(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
      ).toBe(true);
    });
  });
});
