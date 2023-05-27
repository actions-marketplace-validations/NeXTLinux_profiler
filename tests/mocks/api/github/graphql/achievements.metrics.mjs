/**Mocked data */
export default function({faker, query, login = faker.internet.userName()}) {
  console.debug("profiler/compute/mocks > mocking graphql api result > achievements/profiler")
  return ({
    repository: {viewerHasStarred: faker.datatype.boolean()},
    viewer: {login},
  })
}
