const DISCORD_TOKEN = Deno.env.get('DISCORD_TOKEN');

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN environment variable is not set.');
  Deno.exit(1);
}

import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  createBot,
  createDesiredPropertiesObject,
  GatewayIntents,
} from 'discordeno';

export {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionResponseTypes,
  MessageFlags,
} from 'discordeno';

export type Message = typeof bot.transformers.$inferredTypes.message;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;

export const bot = createBot({
  token: DISCORD_TOKEN,
  intents: GatewayIntents.Guilds |
    GatewayIntents.GuildMessages |
    GatewayIntents.MessageContent,
  desiredProperties: createDesiredPropertiesObject({
    message: {
      id: true,
      content: true,
      author: true,
      channelId: true,
      referencedMessage: true,
      attachments: true,
      embeds: true,
      guildId: true,
    },
    attachment: {
      filename: true,
      title: true,
      contentType: true,
      url: true,
      proxyUrl: true,
      height: true,
      width: true,
    },
    channel: {
      id: true,
      guildId: true,
      name: true,
    },
    user: {
      id: true,
      toggles: true,
      username: true,
      discriminator: true,
      avatar: true,
    },
    guild: {
      id: true,
    },
    interaction: {
      id: true,
      data: true,
      channelId: true,
      token: true,
      member: true,
      message: true,
    },
    interactionResource: {
      message: true,
    },
  }),
});
