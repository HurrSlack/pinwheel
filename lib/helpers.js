async function getUserList({ client, token }) {
  const response = await client.users.list({ token });
  return response.members;
}

async function getChannelList({ client, token }) {
  const response = await client.conversations.list({
    token,
    exclude_archived: true,
    types: "public_channel",
  });
  return response.channels;
}

async function getMessage(client, { channel, ts }) {
  const response = await client.reactions.get({
    channel,
    timestamp: ts,
  });
  return response.message;
}

module.exports = {
  getUserList,
  getChannelList,
  getMessage,
};
