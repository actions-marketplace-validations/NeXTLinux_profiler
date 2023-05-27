/**Mocked data */
export default function({faker, query, login = faker.internet.userName()}) {
  console.debug("profiler/compute/mocks > mocking graphql api result > followup/repository/collaborators")
  return ({
    repository: {
      collaborators: {
        nodes: ["github-user"],
      },
    },
  })
}
