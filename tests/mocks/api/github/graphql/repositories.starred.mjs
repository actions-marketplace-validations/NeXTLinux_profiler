/**Mocked data */
export default function({faker, query, login = faker.internet.userName()}) {
  console.debug("profiler/compute/mocks > mocking graphql api result > repositories/starred")
  return ({
    user: {
      repositories: {
        nodes: [
          {nameWithOwner: "nextlinux/profiler"},
        ],
      },
    },
  })
}
