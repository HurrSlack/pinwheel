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

function getPinReact(item) {
  if (!item.reactions) {
    return false;
  }
  return item.reactions.find(
    (reaction) => reaction.name === "pushpin" && reaction.count > 0
  );
}

async function seconds(s) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}

module.exports = {
  getUserList,
  getChannelList,
  getMessage,
  getPinReact,
  seconds,
};
