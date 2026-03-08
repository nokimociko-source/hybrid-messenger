# Broadcast Channels User Guide

## Overview

Broadcast Channels allow you to create one-way communication channels where only administrators can post messages, while subscribers can read and view content. This is perfect for announcements, news updates, and broadcasting information to a large audience.

## Table of Contents

1. [What are Broadcast Channels?](#what-are-broadcast-channels)
2. [Creating a Channel](#creating-a-channel)
3. [Discovering Channels](#discovering-channels)
4. [Subscribing to Channels](#subscribing-to-channels)
5. [Admin Features](#admin-features)
6. [Converting Groups to Channels](#converting-groups-to-channels)
7. [FAQ](#faq)

---

## What are Broadcast Channels?

Broadcast Channels are special chat rooms with the following characteristics:

- **One-way communication**: Only admins can post messages
- **Unlimited subscribers**: No limit on the number of subscribers
- **Public or Private**: Channels can be discoverable or invite-only
- **View statistics**: Admins can see who viewed their messages
- **Categories**: Organize channels by topic

### Channels vs Groups

| Feature | Group | Channel |
|---------|-------|---------|
| Who can post | All members | Admins only |
| Purpose | Two-way discussion | One-way broadcast |
| Member limit | Recommended < 200 | Unlimited |
| View stats | No | Yes (admins) |
| Public discovery | No | Yes (if public) |

---

## Creating a Channel

### Step 1: Open Create Dialog

Click the **+** button in the chat list to open the room creation dialog.

### Step 2: Select Channel Type

Choose **"Канал"** (Channel) instead of **"Группа"** (Group).

![Channel Type Selector](docs/images/channel-type-selector.png)

### Step 3: Configure Channel

1. **Name**: Enter a descriptive channel name
2. **Public Channel**: Check this box to make your channel discoverable
   - Public channels appear in channel discovery
   - Anyone can subscribe without an invite
   - Private channels require an invite link

### Step 4: Create

Click **"Создать канал"** to create your channel. You'll be automatically added as the creator and admin.

### Rate Limiting

- You can create up to 3 channels per hour
- This prevents spam and abuse

---

## Discovering Channels

### Opening Channel Discovery

Click the **"Discover Channels"** button at the top of your chat list.

![Discover Channels Button](docs/images/discover-button.png)

### Searching for Channels

1. Use the search bar to filter channels by name or description
2. Channels are ordered by subscriber count (most popular first)
3. You'll see:
   - Channel name and avatar
   - Description/topic
   - Subscriber count
   - Category (if set)
   - Subscribe button

### Subscribing

Click the **"Subscribe"** button on any channel to join it. The channel will immediately appear in your chat list.

---

## Subscribing to Channels

### Via Discovery

Use the Channel Discovery feature (see above) to find and subscribe to public channels.

### Via Invite Link

If someone shares a private channel invite link with you:

1. Click the invite link
2. You'll see channel details
3. Click "Join Channel" to subscribe

### Managing Subscriptions

To unsubscribe from a channel:

1. Open the channel
2. Click the channel name/header
3. Select "Unsubscribe" or "Leave Channel"

---

## Admin Features

### Posting Messages

As an admin, you can post messages normally:

- Text messages
- Media (images, videos, files)
- Polls
- Stickers and emojis

Subscribers will see your messages but cannot reply in the channel.

### View Statistics

See who viewed your messages:

1. Post a message in your channel
2. After 3 seconds, view counts will appear
3. Click the view count to see:
   - Total number of views
   - List of viewers with usernames and avatars
   - Timestamp of when each person viewed

![View Statistics](docs/images/view-stats.png)

### Managing Subscribers

Access subscriber management:

1. Click the channel name/header
2. Select "Subscribers" or "Members"
3. You can:
   - View all subscribers
   - Remove subscribers
   - Promote subscribers to admin
   - Ban users

### Channel Settings

Configure your channel:

1. Click the channel name/header
2. Select "Settings"
3. Available options:
   - Change channel name
   - Update description/topic
   - Change avatar
   - Set category
   - Toggle public/private
   - Delete channel

### Adding Admins

To add more admins who can post:

1. Go to channel settings
2. Select "Administrators"
3. Click "Add Administrator"
4. Choose a subscriber to promote

---

## Converting Groups to Channels

### When to Convert

Convert a group to a channel when:

- The group has grown too large for discussions
- You want one-way announcements instead of chat
- You need view statistics
- You want to make it publicly discoverable

### How to Convert

1. Open the group (you must be the creator)
2. Click the group name/header
3. Select "Convert to Channel"
4. Review the warning dialog:
   - This action is **irreversible**
   - All members become subscribers
   - Only admins can post after conversion
   - Message history is preserved
5. Click "Convert" to confirm

### What Happens

- Room type changes from "community" to "channel"
- Creator and admins keep posting permissions
- Regular members lose posting permissions
- All message history is preserved
- Members receive a notification about the change

---

## FAQ

### Can I convert a channel back to a group?

No, channel conversion is irreversible. Consider carefully before converting.

### How many channels can I create?

You can create up to 3 channels per hour due to rate limiting.

### Can subscribers see who else is subscribed?

Yes, the subscriber count is visible to everyone. Admins can see the full subscriber list.

### Do subscribers get notifications for new messages?

Yes, subscribers receive notifications for new channel messages just like regular chats. They can mute the channel if they don't want notifications.

### Can I have multiple admins in a channel?

Yes, you can promote any subscriber to admin. Admins can post messages and view statistics.

### What's the difference between creator and admin?

- **Creator**: Can do everything, including deleting the channel and managing admins
- **Admin**: Can post messages and view statistics, but cannot manage other admins

### Can I make a private channel public later?

Yes, you can change the public/private setting in channel settings at any time.

### How long does it take for view counts to appear?

View counts are recorded after a 3-second delay to ensure the user actually viewed the message. Counts update in real-time.

### Can I see who hasn't viewed my message?

No, view statistics only show who has viewed the message, not who hasn't.

### What happens if I delete a channel?

- The channel and all its messages are permanently deleted
- Subscribers are removed
- This action cannot be undone

### Can banned users still see channel messages?

No, banned users are removed from the channel and cannot see new messages.

### Is there a limit on channel subscribers?

No, channels support unlimited subscribers.

### Can I schedule messages in channels?

This feature is not currently available but may be added in the future.

---

## Best Practices

### For Channel Creators

1. **Clear Description**: Write a clear channel description so people know what to expect
2. **Consistent Posting**: Post regularly to keep subscribers engaged
3. **Quality Content**: Focus on quality over quantity
4. **Engage with Stats**: Use view statistics to understand your audience
5. **Moderate Wisely**: Remove spam and inappropriate content promptly

### For Subscribers

1. **Mute if Needed**: Mute channels that post too frequently
2. **Unsubscribe**: Don't hesitate to unsubscribe from channels you're not interested in
3. **Report Issues**: Report spam or inappropriate channels to administrators

---

## Troubleshooting

### I can't post in a channel

- **Reason**: Only admins can post in channels
- **Solution**: If you need to communicate with the admin, send them a direct message

### Channel discovery is empty

- **Reason**: No public channels exist yet, or they don't match your search
- **Solution**: Try a different search term or create your own channel

### View counts aren't updating

- **Reason**: Views are recorded after a 3-second delay
- **Solution**: Wait a few seconds and refresh

### I can't create a channel

- **Reason**: You may have hit the rate limit (3 channels per hour)
- **Solution**: Wait an hour and try again

### Subscribers can't find my channel

- **Reason**: Your channel might be set to private
- **Solution**: Make it public in channel settings, or share an invite link

---

## Support

For additional help or to report issues:

- Check the main documentation at `/docs/README.md`
- Contact support through the app settings
- Report bugs on the project repository

---

**Last Updated**: 2024
**Version**: 1.0
