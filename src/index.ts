import Fastify from "fastify";
import "dotenv/config";
import { env } from "node:process";
import { DefaultGenerics, StreamChat, UserResponse } from "stream-chat";

interface User {
  id: string;
  mobileNumber: string;
  password: string;
}

interface ChatUser {
  id: string;
  role: string;
  avatar: string;
}

interface LoginDTO {
  mobileNumber: string;
  password: string;
}

interface RefreshChatTokenDTO {
  userId: string;
}

interface UpsertChatUsersDTO {
  users: UserResponse<DefaultGenerics>[];
}

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async (request, reply) => {
  return { response: { data: { message: "Hello world!" } } };
});

const serverClient = StreamChat.getInstance(
  env.GET_STREAM_ACCESS_KEY as unknown as string,
  env.GET_STREAM_ACCESS_SECRET as unknown as string
);

const usersData: User[] = [
  {
    id: "1",
    mobileNumber: "9999999999",
    password: "pass9",
  },
  {
    id: "2",
    mobileNumber: "8888888888",
    password: "pass8",
  },
  {
    id: "3",
    mobileNumber: "7777777777",
    password: "pass7",
  },
];

function generateChatToken(userId: string): string {
  //  token that expires in 1 hour
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60;
  const chatToken = serverClient.createToken(userId, expiresIn, issuedAt);
  return chatToken;
}

/**
 * @description Login user and generate chat token
 */
fastify.post("/users/login", async (request, reply) => {
  const { mobileNumber, password } = request.body as LoginDTO;
  const user = usersData.find(
    (user) => user.mobileNumber === mobileNumber && user.password === password
  );
  if (!user) {
    return reply
      .status(400)
      .send({ response: { data: { message: "Invalid credentials" } } });
  }
  const chatToken = generateChatToken(user.id);
  const data = {
    message: "Login Successfully",
    chatToken,
    ...user,
  };
  return reply.status(200).send({ response: { data } });
});

/**
 * @description issue a new chat token.
 */
fastify.post("/users/refresh-chat-token", async (request, reply) => {
  const { userId } = request.body as RefreshChatTokenDTO;
  const user = usersData.find((user) => user.id === userId);
  if (!user) {
    return reply
      .status(404)
      .send({ response: { data: { message: "User Not Found" } } });
  }

  const chatToken = generateChatToken(user.id);
  const data = {
    message: "Success",
    chatToken,
    ...user,
  };
  return reply.status(200).send({ response: { data } });
});

/**
 * @description upsert users.
 */
fastify.post("/users/chat/upsert-users", async (request, reply) => {
  const { users } = request.body as UpsertChatUsersDTO;
  if (users.length > 100) {
    return reply.status(400).send({
      response: { data: { message: "Maximun 100 Users allowed to upsert" } },
    });
  }

  const updateResponse = await serverClient.upsertUsers(users);
  // each user object is updated accordingly

  const data = {
    message: "Success",
    updatedData: updateResponse,
  };
  return reply.status(201).send({ response: { data } });
});

const start = async () => {
  try {
    const port = env.PORT as unknown as number;
    await fastify.listen({ port: port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
