/**Mocked data */
export default function({faker, query, login = faker.internet.userName()}) {
  console.debug("profiler/compute/mocks > mocking graphql api result > licenses/repository")
  return ({
    user: {
      repository: {
        licenseInfo: {spdxId: "MIT", name: "MIT License", nickname: null, key: "mit"},
        url: "https://github.com/nextlinux/profiler",
        databaseId: 293860197,
      },
    },
  })
}
