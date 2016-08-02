# Pinwheel
tweet pinned slack messages

To set up:

- Clone
- Create a slack but integration in slack, note the token
- Create a twitter app, note the tokens
- create a file called "env_variables" in the root of the project with the following format:

```
SLACK_TOKEN=XXX
TWITTER_CONSUMER_KEY=XXX
TWITTER_CONSUMER_SECRET=XXX
TWITTER_ACCESS_TOKEN=XXX
TWITTER_ACCESS_TOKEN_SECRET=XXX
```

run ```node app.js```

