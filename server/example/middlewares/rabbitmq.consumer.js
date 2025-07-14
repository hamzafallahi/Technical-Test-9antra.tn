const amqp = require("amqplib");
// Import database models directly instead of using HTTP calls
const { User, Provider,Calendar,WorkingSlot, MeetingTool,sequelize } = require("../db");
// Import deserializers to properly format incoming data
const UserDeserializer = require("../serializers/user.deserializer");
const ProviderDeserializer = require("../serializers/provider.deserializer");
const MeetingToolDeserializer = require("../serializers/meetingToolDeserializer");
const BusinessError = require("../error/BusinessError");
// No need to import config as we're using hardcoded connection string
const crypto = require('crypto');
class RabbitMQConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Use hardcoded connection string instead of configuration
      this.connection = await amqp.connect(process.env.RABBITMQ_CON);
      this.channel = await this.connection.createChannel();

      // Setup exchange
      await this.channel.assertExchange("sync_exchange", "direct");

      // Setup queues
      const userQueue = await this.channel.assertQueue(
        "user_sync_queue_calendar_ms"
      );
      const providerQueue = await this.channel.assertQueue(
        "provider_sync_queue"
      );
      const meetingToolQueue = await this.channel.assertQueue(
        "meeting_tool_sync_queue"
      );

      // Bind queues to exchange with routing keys
      await this.channel.bindQueue(
        userQueue.queue,
        "sync_exchange",
        "user.created"
      );
      await this.channel.bindQueue(
        userQueue.queue,
        "sync_exchange",
        "user.updated"
      );
      await this.channel.bindQueue(
        userQueue.queue,
        "sync_exchange",
        "user.deleted"
      );

      await this.channel.bindQueue(
        providerQueue.queue,
        "sync_exchange",
        "provider.created"
      );
      await this.channel.bindQueue(
        providerQueue.queue,
        "sync_exchange",
        "provider.updated"
      );
      await this.channel.bindQueue(
        providerQueue.queue,
        "sync_exchange",
        "provider.deleted"
      );

      await this.channel.bindQueue(
        meetingToolQueue.queue,
        "sync_exchange",
        "meeting_tool.created"
      );
      await this.channel.bindQueue(
        meetingToolQueue.queue,
        "sync_exchange",
        "meeting_tool.updated"
      );
      await this.channel.bindQueue(
        meetingToolQueue.queue,
        "sync_exchange",
        "meeting_tool.deleted"
      );

      this.isConnected = true;
      console.log("RabbitMQ consumer connected");

      this.consumeUserMessages(userQueue.queue);
      this.consumeProviderMessages(providerQueue.queue);
      this.consumeMeetingToolMessages(meetingToolQueue.queue);
    } catch (error) {
      console.error("RabbitMQ consumer connection error:", error);
      // Try to reconnect after a delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  async consumeUserMessages(queue) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      this.channel.consume(queue, async (msg) => {
        if (msg !== null) {
          try {
            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString());

            console.log(
              `Received user message with routing key: ${routingKey}`
            );

            switch (routingKey) {
              case "user.created":
                await this.handleUserCreated(content);
                break;
              case "user.updated":
                await this.handleUserUpdated(content);
                break;
              case "user.deleted":
                await this.handleUserDeleted(content);
                break;
              default:
                console.log(`Unknown routing key for user: ${routingKey}`);
            }

            // Acknowledge the message
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing user message:", error);
            // Negative acknowledge in case of error
            this.channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      console.error("Error consuming user messages:", error);
    }
  }

  async consumeProviderMessages(queue) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      this.channel.consume(queue, async (msg) => {
        if (msg !== null) {
          try {
            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString());

            console.log(
              `Received provider message with routing key: ${routingKey}`
            );

            switch (routingKey) {
              case "provider.created":
                await this.handleProviderCreated(content);
                break;
              case "provider.updated":
                await this.handleProviderUpdated(content);
                break;
              case "provider.deleted":
                await this.handleProviderDeleted(content);
                break;
              default:
                console.log(`Unknown routing key for provider: ${routingKey}`);
            }

            // Acknowledge the message
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing provider message:", error);
            // Negative acknowledge in case of error
            this.channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      console.error("Error consuming provider messages:", error);
    }
  }

  async consumeMeetingToolMessages(queue) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      this.channel.consume(queue, async (msg) => {
        if (msg !== null) {
          try {
            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString());

            console.log(
              `Received meeting tool message with routing key: ${routingKey}`
            );

            switch (routingKey) {
              case "meeting_tool.created":
                await this.handleMeetingToolCreated(content);
                break;
              case "meeting_tool.updated":
                await this.handleMeetingToolUpdated(content);
                break;
              case "meeting_tool.deleted":
                await this.handleMeetingToolDeleted(content);
                break;
              default:
                console.log(
                  `Unknown routing key for meeting tool: ${routingKey}`
                );
            }

            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing meeting tool message:", error);
            this.channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      console.error("Error consuming meeting tool messages:", error);
    }
  }

  // Modified to directly save to database
  async handleUserCreated(data) {
    try {
      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the user data
      const userData = await this._deserializeUserData(req);

      // Create user directly in the database
      const user = await User.create(userData);

      console.log(`User created directly in database: ${user.id}`);
      return user;
    } catch (error) {
      console.error("Error creating user in database:", error);
      throw error;
    }
  }

  async handleUserUpdated(data) {
    try {
      const userId = data.data.id;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found for update`);
        throw new Error(`User with ID ${userId} not found`);
      }

      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the user data
      const userData = await this._deserializeUserData(req);

      // Update user directly in the database
      await user.update(userData);

      console.log(`User ${userId} updated directly in database`);
      return user;
    } catch (error) {
      console.error("Error updating user in database:", error);
      throw error;
    }
  }

  async handleUserDeleted(data) {
    try {
      const userId = data.id;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found for deletion`);
        throw new Error(`User with ID ${userId} not found`);
      }

      // Delete user directly from database
      await user.destroy();

      console.log(`User ${userId} deleted directly from database`);
      return true;
    } catch (error) {
      console.error("Error deleting user from database:", error);
      throw error;
    }
  }

async handleProviderCreated(data) {
    try {
      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the provider data
      const providerData = await this._deserializeProviderData(req);

      // Check if provider already exists to prevent duplicate key errors
      const existingProvider = await Provider.findByPk(providerData.id);
      let provider;
      
      if (existingProvider) {
        console.log(`Provider ${providerData.id} already exists, skipping creation`);
        provider = existingProvider;
      } else {
        // Create provider directly in the database
        provider = await Provider.create(providerData);
        console.log(`Provider created directly in database: ${provider.id}`);
      }
      
      // Check if the provider already has calendars
      const existingCalendars = await Calendar.findOne({
        where: { provider_id: provider.id }
      });
      
      // Only create default calendar if provider doesn't have any calendars yet
      if (!existingCalendars) {
        // Create a default calendar with working slots for the new provider
        await CalendarFactory.createDefaultCalendarWithWorkingSlots(provider);
        console.log(`Default calendar created for provider: ${provider.id}`);
      } else {
        console.log(`Provider ${provider.id} already has calendars, skipping default calendar creation`);
      }

      return provider;
    } catch (error) {
      console.error("Error creating provider in database:", error);
      throw error;
    }
  }

  async handleProviderUpdated(data) {
    try {
      const providerId = data.data.id;

      // Check if provider exists
      const provider = await Provider.findByPk(providerId);
      if (!provider) {
        console.error(`Provider with ID ${providerId} not found for update`);
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the provider data
      const providerData = await this._deserializeProviderData(req);

      // Update provider directly in the database
      await provider.update(providerData);

      console.log(`Provider ${providerId} updated directly in database`);
      return provider;
    } catch (error) {
      console.error("Error updating provider in database:", error);
      throw error;
    }
  }

  async handleProviderDeleted(data) {
    try {
      const providerId = data.id;

      // Check if provider exists
      const provider = await Provider.findByPk(providerId);
      if (!provider) {
        console.error(`Provider with ID ${providerId} not found for deletion`);
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      // Delete provider directly from database
      await provider.destroy();

      console.log(`Provider ${providerId} deleted directly from database`);
      return true;
    } catch (error) {
      console.error("Error deleting provider from database:", error);
      throw error;
    }
  }

  async handleMeetingToolCreated(data) {
    try {
      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the meeting tool data
      const meetingToolData = await this._deserializeMeetingToolData(req);

      // Create meeting tool directly in the database
      const meetingTool = await MeetingTool.create(meetingToolData);

      console.log(
        `Meeting tool created directly in database: ${meetingTool.id}`
      );
      return meetingTool;
    } catch (error) {
      console.error("Error creating meeting tool in database:", error);
      throw error;
    }
  }

  async handleMeetingToolUpdated(data) {
    try {
      const meetingToolId = data.data && data.data.id ? data.data.id : data.id;

      // Check if meeting tool exists
      const meetingTool = await MeetingTool.findByPk(meetingToolId);
      if (!meetingTool) {
        console.error(
          `Meeting tool with ID ${meetingToolId} not found for update`
        );
        throw new Error(`Meeting tool with ID ${meetingToolId} not found`);
      }

      // Format the request object for the deserializer
      const req = { body: data };

      // Deserialize the meeting tool data
      const meetingToolData = await this._deserializeMeetingToolData(req);

      // Update meeting tool directly in the database
      await meetingTool.update(meetingToolData);

      console.log(`Meeting tool ${meetingToolId} updated directly in database`);
      return meetingTool;
    } catch (error) {
      console.error("Error updating meeting tool in database:", error);
      throw error;
    }
  }

  async handleMeetingToolDeleted(data) {
    try {
      // Extract meeting tool ID from message
      const meetingToolId = data.id;

      // Check if meeting tool exists
      const meetingTool = await MeetingTool.findByPk(meetingToolId);
      if (!meetingTool) {
        console.error(
          `Meeting tool with ID ${meetingToolId} not found for deletion`
        );
        throw new Error(`Meeting tool with ID ${meetingToolId} not found`);
      }

      // Delete meeting tool directly from database
      await meetingTool.destroy();

      console.log(
        `Meeting tool ${meetingToolId} deleted directly from database`
      );
      return true;
    } catch (error) {
      console.error("Error deleting meeting tool from database:", error);
      throw error;
    }
  }

  // Helper method to deserialize user data
  async _deserializeUserData(req) {
    try {
      return UserDeserializer.deserialize(req);
    } catch (error) {
      console.error("Error deserializing user data:", error);
      throw new BusinessError(
        400,
        "INVALID_FORMAT",
        "Invalid user data format"
      );
    }
  }

  // Helper method to deserialize provider data
  async _deserializeProviderData(req) {
    try {
      return await ProviderDeserializer.deserialize(req);
    } catch (error) {
      console.error("Error deserializing provider data:", error);
      throw new BusinessError(
        400,
        "INVALID_FORMAT",
        "Invalid provider data format"
      );
    }
  }

  // Helper method to deserialize meeting tool data
  async _deserializeMeetingToolData(req) {
    try {
      return await MeetingToolDeserializer.deserialize(req.body, req);
    } catch (error) {
      console.error("Error deserializing meeting tool data:", error);
      throw new BusinessError(
        400,
        "INVALID_FORMAT",
        "Invalid meeting tool data format"
      );
    }
  }
}


/**
 * Calendar Factory class responsible for creating default calendars with working slots
 */
class CalendarFactory {
  /**
   * List of valid timezone formats
   */
  static VALID_TIMEZONES = [
    "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:30", "UTC-09:00", "UTC-08:00", 
    "UTC-07:00", "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:30", "UTC-03:00", 
    "UTC-02:00", "UTC-01:00", "UTC±00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", 
    "UTC+03:30", "UTC+04:00", "UTC+04:30", "UTC+05:00", "UTC+05:30", "UTC+05:45", 
    "UTC+06:00", "UTC+06:30", "UTC+07:00", "UTC+08:00", "UTC+08:45", "UTC+09:00", 
    "UTC+09:30", "UTC+10:00", "UTC+10:30", "UTC+11:00", "UTC+12:00", "UTC+12:45", 
    "UTC+13:00", "UTC+14:00"
  ];
  
  /**
   * Get a timezone string based on offset
   * @param {number} offsetMinutes - Timezone offset in minutes
   * @returns {string} - UTC timezone string in the specified format
   */
  static getTimezoneFromOffset(offsetMinutes) {
    // Convert minutes to hours

    const hours = Math.round(Math.abs(offsetMinutes) / 60);
    console.log(`hours = Math.floor(Math.abs(offsetMinutes) / 60) : ${hours}`);
    const minutes = Math.abs(offsetMinutes) % 60;
    
    // Format the time component
    const timeComponent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Determine the sign
    const sign = offsetMinutes >= 0 ? '+' : '-';
    
    // Format the timezone string
    const timezone = `UTC${sign}${timeComponent}`;
    console.log(`Detected timezone const timezone = UTC{sign}{timeComponent}': ${timezone}`);
    console.log(`this.VALID_TIMEZONES.find(tz => tz === timezone)': this.VALID_TIMEZONES.find(tz => tz === timezone)`);
    // Find the closest match in our valid timezones
    return this.VALID_TIMEZONES.find(tz => tz === timezone) || "UTC+00:00";


    
  }
  
  /**
   * Creates a default calendar with working slots for a provider
   * @param {Object} provider - The provider object
   * @returns {Promise<Object>} - The created calendar object
   */  static async createDefaultCalendarWithWorkingSlots(provider) {
    // Generate a random slug suffix
    const randomSlug = crypto.randomBytes(4).toString('hex');
    
    // Get timezone information - try to detect from system
    const now = new Date();
    const offsetMinutes = now.getTimezoneOffset() * -1;
    console.log(offsetMinutes); // getTimezoneOffset returns negative values for positive UTC offsets
    const timezone = this.getTimezoneFromOffset(offsetMinutes);
    
    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();
    
    try {
      // Default calendar data
      const calendarData = {
        provider_id: provider.id,
        name: "Welcome Calendar",
        description: "Your first calendar for managing appointments",
        timezone: timezone,
        queuing_system: false,
        meeting_tool_id: null, // Set to null instead of hardcoded UUID
        duration: "00:30:00",
        color: "GREEN",
        slug: `welcome-calendar-${randomSlug}`
      };
      
      // Create the calendar
      const calendar = await Calendar.create(calendarData, { transaction });
      
      // Define working days
      const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
      // Format today's date in YYYY-MM-DD format for creation_date
      /*const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];*/
      
      // Create working slots for each day
      const workingSlots = await Promise.all(workingDays.map(day => {
        return WorkingSlot.create({
          calendar_id: calendar.id,
          day_of_week: day,
          start_time: "09:00:00",
          end_time: "17:00:00",
          creation_date: null // Add a properly formatted creation_date
        }, { transaction });
      }));
      
      // Commit the transaction
      await transaction.commit();
      
      console.log(`Created default calendar '${calendar.name}' with ${workingSlots.length} working slots for provider ${provider.id}`);
      
      return calendar;
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error("Error creating default calendar:", error);
      throw error;
    }
  }
}


// Create a singleton instance
const rabbitMQConsumer = new RabbitMQConsumer();

// Initialize the connection when the module is loaded
rabbitMQConsumer.connect();

module.exports = rabbitMQConsumer;
