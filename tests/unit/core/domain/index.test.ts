/**
 * Unit tests for Domain Layer Module Index
 */

import * as DomainModule from '../../../../src/core/domain/index';
import {
  ValueObject,
  ValueObjectValidationError,
  FilePath,
  DocumentAnalysis,
  DomainEvent,
  ConversionStartedEvent,
  ConversionCompletedEvent,
  InMemoryEventPublisher,
  DOMAIN_EVENT_TYPES,
  DomainEventType,
} from '../../../../src/core/domain/index';

describe('Domain Layer Module Index', () => {
  describe('module exports verification', () => {
    it('should export value object infrastructure', () => {
      expect(DomainModule.ValueObject).toBeDefined();
      expect(typeof DomainModule.ValueObject).toBe('function');
      expect(DomainModule.ValueObjectValidationError).toBeDefined();
      expect(typeof DomainModule.ValueObjectValidationError).toBe('function');
    });

    it('should export specific value objects', () => {
      expect(DomainModule.FilePath).toBeDefined();
      expect(typeof DomainModule.FilePath).toBe('function');
      expect(DomainModule.DocumentAnalysis).toBeDefined();
      expect(typeof DomainModule.DocumentAnalysis).toBe('function');
    });

    it('should export domain events infrastructure', () => {
      expect(DomainModule.DomainEvent).toBeDefined();
      expect(typeof DomainModule.DomainEvent).toBe('function');
      expect(DomainModule.InMemoryEventPublisher).toBeDefined();
      expect(typeof DomainModule.InMemoryEventPublisher).toBe('function');
    });

    it('should export conversion events', () => {
      expect(DomainModule.ConversionStartedEvent).toBeDefined();
      expect(DomainModule.ConversionCompletedEvent).toBeDefined();
      expect(DomainModule.ConversionFailedEvent).toBeDefined();
      expect(DomainModule.BatchConversionStartedEvent).toBeDefined();
      expect(DomainModule.BatchConversionCompletedEvent).toBeDefined();
    });

    it('should export event logging classes', () => {
      expect(DomainModule.DomainEventLoggerHandler).toBeDefined();
      expect(DomainModule.PerformanceDomainEventLogger).toBeDefined();
      expect(DomainModule.ConversionEventAggregatorLogger).toBeDefined();
    });

    it('should export event type constants and types', () => {
      expect(DomainModule.DOMAIN_EVENT_TYPES).toBeDefined();
      expect(typeof DomainModule.DOMAIN_EVENT_TYPES).toBe('object');
    });
  });

  describe('functional integration tests', () => {
    it('should allow creating value objects', () => {
      const filePath = new FilePath('/path/to/file.md');
      expect(filePath).toBeInstanceOf(FilePath);
      expect(filePath).toBeInstanceOf(ValueObject);

      const documentAnalysis = new DocumentAnalysis({
        fileSize: 1024,
        wordCount: 500,
        readingTime: 120,
      });
      expect(documentAnalysis).toBeInstanceOf(DocumentAnalysis);
      expect(documentAnalysis).toBeInstanceOf(ValueObject);
    });

    it('should allow creating and publishing events', async () => {
      const publisher = new InMemoryEventPublisher();
      const event = new ConversionStartedEvent('/input.md', '/output.pdf', {});

      const mockHandler = {
        handle: jest.fn(),
      };

      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_STARTED, mockHandler);
      await publisher.publish(event);

      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should handle validation errors properly', () => {
      expect(() => {
        new FilePath(''); // Invalid empty path
      }).toThrow(ValueObjectValidationError);

      expect(() => {
        new DocumentAnalysis({} as any); // Invalid analysis data
      }).toThrow(ValueObjectValidationError);

      expect(() => {
        new ConversionStartedEvent('', '/output.pdf', {}); // Invalid empty input
      }).toThrow();
    });

    it('should work with type system properly', () => {
      const eventType: DomainEventType = DOMAIN_EVENT_TYPES.CONVERSION_STARTED;
      expect(eventType).toBe('conversion.started');

      // Test that event types match actual event classes
      expect(eventType).toBe(ConversionStartedEvent.EVENT_TYPE);
    });
  });

  describe('value objects integration', () => {
    it('should create and manipulate FilePath objects', () => {
      const filePath = new FilePath('/path/to/document.md');

      expect(filePath.value).toBe('/path/to/document.md');
      expect(filePath.basename).toBe('document');
      expect(filePath.extension).toBe('.md');
      expect(filePath.filename).toBe('document.md');
      expect(filePath.isMarkdown()).toBe(true);

      const outputPath = filePath.toOutputPath();
      expect(outputPath).toBe('/path/to/document.pdf');
    });

    it('should create and analyze DocumentAnalysis objects', () => {
      const analysisData = {
        fileSize: 2048,
        wordCount: 1000,
        readingTime: 300,
        contentComplexity: {
          score: 6,
          recommendedTocDepth: 3,
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.9,
          needsChineseSupport: false,
        },
      };

      const analysis = new DocumentAnalysis(analysisData);

      expect(analysis.complexityLevel).toBe('moderate');
      expect(analysis.needsChineseSupport).toBe(false);
      expect(analysis.primaryLanguage).toBe('en');
      expect(analysis.recommendedTocDepth).toBe(3);
      expect(analysis.estimatedProcessingTime).toBeGreaterThan(0);
    });

    it('should validate value object immutability', () => {
      const filePath = new FilePath('/test/file.md');
      const analysis = new DocumentAnalysis({
        fileSize: 1024,
        wordCount: 500,
        readingTime: 120,
      });

      expect(Object.isFrozen(filePath.value)).toBe(true);
      expect(Object.isFrozen(analysis.value)).toBe(true);
    });

    it('should validate value object equality', () => {
      const filePath1 = new FilePath('/same/path.md');
      const filePath2 = new FilePath('/same/path.md');
      const filePath3 = new FilePath('/different/path.md');

      expect(filePath1.equals(filePath2)).toBe(true);
      expect(filePath1.equals(filePath3)).toBe(false);

      const analysisData = {
        fileSize: 1024,
        wordCount: 500,
        readingTime: 120,
      };

      const analysis1 = new DocumentAnalysis(analysisData);
      const analysis2 = new DocumentAnalysis(analysisData);
      const analysis3 = new DocumentAnalysis({
        ...analysisData,
        wordCount: 600,
      });

      expect(analysis1.equals(analysis2)).toBe(true);
      expect(analysis1.equals(analysis3)).toBe(false);
    });
  });

  describe('domain events integration', () => {
    it('should create and handle conversion workflow events', async () => {
      const publisher = new InMemoryEventPublisher();
      const events: any[] = [];

      const handler = {
        handle: async (event: any) => {
          events.push(event);
        },
      };

      // Subscribe to all conversion events
      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_STARTED, handler);
      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED, handler);
      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_FAILED, handler);

      // Simulate conversion workflow
      const startedEvent = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        { theme: 'default' },
      );
      await publisher.publish(startedEvent);

      const completedEvent = new DomainModule.ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
        { pages: 3 },
      );
      await publisher.publish(completedEvent);

      expect(events).toHaveLength(2);
      expect(events[0]).toBe(startedEvent);
      expect(events[1]).toBe(completedEvent);
    });

    it('should create and handle batch conversion events', async () => {
      const publisher = new InMemoryEventPublisher();
      const events: any[] = [];

      const handler = {
        handle: async (event: any) => {
          events.push(event);
        },
      };

      publisher.subscribe(DOMAIN_EVENT_TYPES.BATCH_CONVERSION_STARTED, handler);
      publisher.subscribe(
        DOMAIN_EVENT_TYPES.BATCH_CONVERSION_COMPLETED,
        handler,
      );

      const batchStarted = new DomainModule.BatchConversionStartedEvent(
        ['/file1.md', '/file2.md'],
        '/output',
        { parallelProcessing: true },
      );
      await publisher.publish(batchStarted);

      const batchCompleted = new DomainModule.BatchConversionCompletedEvent(
        2,
        2,
        0,
        3000,
        [
          {
            inputFile: '/file1.md',
            outputFile: '/output/file1.pdf',
            success: true,
          },
          {
            inputFile: '/file2.md',
            outputFile: '/output/file2.pdf',
            success: true,
          },
        ],
      );
      await publisher.publish(batchCompleted);

      expect(events).toHaveLength(2);
      expect(events[0].inputFiles).toEqual(['/file1.md', '/file2.md']);
      expect(events[1].successCount).toBe(2);
    });

    it('should integrate with event loggers', async () => {
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn(),
        enableFileLogging: jest.fn(),
        disableFileLogging: jest.fn(),
        rotateLogs: jest.fn(),
        getLogStats: jest.fn(),
        isFileLoggingEnabled: jest.fn(),
        cleanup: jest.fn(),
      };

      const publisher = new InMemoryEventPublisher();
      const eventLogger = new DomainModule.DomainEventLoggerHandler(mockLogger);
      const performanceLogger = new DomainModule.PerformanceDomainEventLogger(
        mockLogger,
      );

      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED, eventLogger);
      publisher.subscribe(
        DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED,
        performanceLogger,
      );

      const event = new DomainModule.ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
      );
      await publisher.publish(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Domain Event',
        expect.objectContaining({
          eventType: 'conversion.completed',
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Domain Event Performance',
        expect.objectContaining({
          eventType: 'conversion.completed',
        }),
      );
    });
  });

  describe('cross-layer integration', () => {
    it('should combine value objects with events', async () => {
      const filePath = new FilePath('/document.md');
      const analysis = new DocumentAnalysis({
        fileSize: 1024,
        wordCount: 500,
        readingTime: 120,
      });

      // Create conversion event using value object data
      const event = new ConversionStartedEvent(
        filePath.value,
        filePath.toOutputPath(),
        {
          estimatedProcessingTime: analysis.estimatedProcessingTime,
          complexity: analysis.complexityLevel,
          needsChineseSupport: analysis.needsChineseSupport,
        },
      );

      expect(event.inputFile).toBe('/document.md');
      expect(event.outputFile).toBe('/document.pdf');
      expect(event.conversionOptions.complexity).toBe('simple');
      expect(event.conversionOptions.needsChineseSupport).toBe(false);
    });

    it('should handle complete document processing workflow', async () => {
      // Step 1: Create value objects
      const inputPath = new FilePath('/documents/report.md');
      const analysis = new DocumentAnalysis({
        fileSize: 4096,
        wordCount: 2000,
        readingTime: 600,
        contentComplexity: { score: 7, recommendedTocDepth: 4 },
        languageDetection: {
          primary: 'en',
          confidence: 0.95,
          needsChineseSupport: false,
        },
      });

      // Step 2: Setup event publisher and loggers
      const publisher = new InMemoryEventPublisher();
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn(),
        enableFileLogging: jest.fn(),
        disableFileLogging: jest.fn(),
        rotateLogs: jest.fn(),
        getLogStats: jest.fn(),
        isFileLoggingEnabled: jest.fn(),
        cleanup: jest.fn(),
      };

      const aggregatorLogger = new DomainModule.ConversionEventAggregatorLogger(
        mockLogger,
      );
      publisher.subscribe(
        DOMAIN_EVENT_TYPES.CONVERSION_STARTED,
        aggregatorLogger,
      );
      publisher.subscribe(
        DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED,
        aggregatorLogger,
      );

      // Step 3: Execute workflow
      const startedEvent = new ConversionStartedEvent(
        inputPath.value,
        inputPath.toOutputPath(),
        {
          complexity: analysis.complexityLevel,
          estimatedTime: analysis.estimatedProcessingTime,
          tocDepth: analysis.recommendedTocDepth,
        },
      );
      await publisher.publish(startedEvent);

      const completedEvent = new DomainModule.ConversionCompletedEvent(
        inputPath.value,
        inputPath.toOutputPath(),
        analysis.estimatedProcessingTime,
        analysis.value.fileSize * 2, // Assume PDF is 2x larger
        {
          pages: Math.ceil(analysis.value.wordCount / 500),
          complexity: analysis.complexityLevel,
        },
      );
      await publisher.publish(completedEvent);

      // Step 4: Verify workflow
      const stats = aggregatorLogger.getConversionStats();
      expect(stats.totalConversions).toBe(1);
      expect(stats.successfulConversions).toBe(1);
      expect(stats.failedConversions).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.averageFileSize).toBe(8192); // 4096 * 2
    });
  });

  describe('module architecture compliance', () => {
    it('should follow dependency direction (no circular dependencies)', () => {
      // Value objects should not depend on events
      const filePath = new FilePath('/test.md');
      expect(filePath).toBeInstanceOf(ValueObject);

      // Events can reference value object types but not instances directly
      const event = new ConversionStartedEvent(
        '/input.md', // string, not FilePath instance
        '/output.pdf',
        {},
      );
      expect(event).toBeInstanceOf(DomainEvent);
    });

    it('should provide clean separation of concerns', () => {
      // Value objects are pure (no side effects)
      const analysis = new DocumentAnalysis({
        fileSize: 1024,
        wordCount: 500,
        readingTime: 120,
      });

      // Multiple calls should return same results
      expect(analysis.complexityLevel).toBe(analysis.complexityLevel);
      expect(analysis.estimatedProcessingTime).toBe(
        analysis.estimatedProcessingTime,
      );

      // Events carry data but don't perform business logic
      const event = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1000,
        2048,
      );
      expect(event.getEventData()).toEqual({
        inputFile: '/input.md',
        outputFile: '/output.pdf',
        processingTime: 1000,
        fileSize: 2048,
        metadata: {},
      });
    });

    it('should support extensibility through interfaces', () => {
      // Custom event handler
      class CustomHandler
        implements DomainModule.IDomainEventHandler<DomainEvent>
      {
        public handledEvents: DomainEvent[] = [];

        async handle(event: DomainEvent): Promise<void> {
          this.handledEvents.push(event);
        }
      }

      const handler = new CustomHandler();
      expect(typeof handler.handle).toBe('function');

      // Custom value object
      class CustomValueObject extends ValueObject<string> {
        protected validate(value: string): void {
          if (!value || value.length < 3) {
            throw new ValueObjectValidationError(
              'CustomValueObject',
              value,
              'min-length',
              'Value must be at least 3 characters',
            );
          }
        }
      }

      const customVO = new CustomValueObject('test');
      expect(customVO.value).toBe('test');
      expect(() => new CustomValueObject('xx')).toThrow(
        ValueObjectValidationError,
      );
    });
  });
});
