;(async function() {
  //App
  return new Vue({
    //Initialization
    el: "main",
    async mounted() {
      //Palette
      try {
        this.palette = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        if (localStorage.getItem("session.profiler"))
          axios.defaults.headers.common["x-profiler-session"] = localStorage.getItem("session.profiler")
      }
      catch (error) {}
      //Embed
      this.embed = !!(new URLSearchParams(location.search).get("embed"))
      //From local storage
      this.localstorage = !!(new URLSearchParams(location.search).get("localstorage"))
      //User
      const user = location.pathname.split("/").pop()
      if ((user) && (!["about", "insights"].includes(user))) {
        this.user = user
        await this.search()
      }
      else {
        const user = new URLSearchParams(location.search).get("user")
        this.searchable = true
        if (user) {
          this.user = user
          this.search()
        }
      }
      //Init
      await Promise.all([
        //GitHub limit tracker
        (async () => {
          const {data: requests} = await axios.get("/.requests")
          this.requests = requests
          if (!requests.login) {
            localStorage.removeItem("session.profiler")
            delete axios.defaults.headers.common["x-profiler-session"]
          }
        })(),
        //Version
        (async () => {
          const {data: version} = await axios.get("/.version")
          this.version = `v${version}`
        })(),
        //Hosted
        (async () => {
          const {data: hosted} = await axios.get("/.hosted")
          this.hosted = hosted
        })(),
        //OAuth
        (async () => {
          const {data: enabled} = await axios.get("/.oauth/enabled")
          this.oauth = enabled
        })(),
      ])
    },
    //Watchers
    watch: {
      palette: {
        immediate: true,
        handler(current, previous) {
          document.querySelector("body").classList.remove(previous)
          document.querySelector("body").classList.add(current)
        },
      },
    },
    //Methods
    methods: {
      format(type, value, options) {
        switch (type) {
          case "plural":
            if (options?.y)
              return (value !== 1) ? "ies" : "y"
            return (value !== 1) ? "s" : ""
          case "number":
            return new Intl.NumberFormat(navigator.lang, options).format(value)
          case "date":
            return new Intl.DateTimeFormat(navigator.lang, options).format(new Date(value))
          case "comment":
            const baseUrl = String.raw`https?:\/\/(?:www\.)?github.com\/([\w.-]+\/[\w.-]+)\/`
            return value
              .replace(
                RegExp(baseUrl + String.raw`(?:issues|pull|discussions)\/(\d+)(?:\?[\w-]+)?(#[\w-]+)?(?=<)`, "g"),
                (_, repo, id, comment) => (options?.repo === repo ? "" : repo) + `#${id}` + (comment ? ` (comment)` : ""),
              ) // -> 'lowlighter/profiler#123'
              .replace(
                RegExp(baseUrl + String.raw`commit\/([\da-f]+)(?=<)`, "g"),
                (_, repo, sha) => (options?.repo === repo ? "" : repo + "@") + sha,
              ) // -> 'lowlighter/profiler@123abc'
              .replace(
                RegExp(baseUrl + String.raw`compare\/([\w-.]+...[\w-.]+)(?=<)`, "g"),
                (_, repo, tags) => (options?.repo === repo ? "" : repo + "@") + tags,
              ) // -> 'lowlighter/profiler@1.0...1.1'
              .replace(
                /[^&]#(\d+)/g,
                (_, id) => `<a href="https://github.com/${options?.repo}/issues/${id}">#${id}</a>`,
              ) // -> #123
              .replace(
                /@([-\w]+)/g,
                (_, user) => `<a href="https://github.com/${user}">@${user}</a>`,
              ) // -> @user
        }
        return value
      },
      async search() {
        try {
          this.error = null
          this.profiler = null
          this.pending = true
          if (this.localstorage) {
            this.profiler = JSON.parse(localStorage.getItem("local.profiler") ?? "null")
            this.loaded = ["base", ...Object.keys(this.profiler?.rendered?.plugins ?? {})]
            return
          }
          const {processing, ...data} = (await axios.get(`/insights/query/${this.user}`)).data
          if (processing) {
            let completed = 0
            this.progress = 1 / (data.plugins.length + 1)
            this.loaded = []
            const retry = async (plugin, attempts = 60, interval = 10) => {
              if (this.loaded.includes(plugin))
                return
              do {
                try {
                  const {data} = await axios.get(`/insights/query/${this.user}/${plugin}`)
                  if (!data)
                    throw new Error(`${plugin}: no data`)
                  if (plugin === "base")
                    this.profiler = {rendered: data, mime: "application/json", errors: []}
                  else
                    Object.assign(this.profiler.rendered.plugins, {[plugin]: data})
                  break
                }
                catch {
                  console.warn(`${plugin}: no data yet, retrying in ${interval} seconds`)
                  await new Promise(solve => setTimeout(solve, interval * 1000))
                }
              }
              while (--attempts)
              completed++
              this.progress = completed / (data.plugins.length + 1)
              this.loaded.push(plugin)
            }
            await retry("base", 30, 5)
            await Promise.allSettled(data.plugins.map(plugin => retry(plugin)))
          }
          else {
            this.profiler = data
            this.loaded = ["base", ...Object.keys(this.profiler?.rendered?.plugins ?? {})]
          }
        }
        catch (error) {
          this.error = {code: error.response.status, message: error.response.data}
        }
        finally {
          this.pending = false
          try {
            const {data: requests} = await axios.get("/.requests")
            this.requests = requests
          }
          catch {}
        }
      },
    },
    //Computed properties
    computed: {
      params() {
        return new URLSearchParams({from: location.href})
      },
      warnings() {
        return Object.entries(this.profiler?.rendered.plugins ?? {}).map(([_, value]) => value?.error).filter(value => value)
      },
      stats() {
        return this.profiler?.rendered.user ?? null
      },
      sponsors() {
        return this.profiler?.rendered.plugins?.sponsors ?? null
      },
      ranked() {
        return this.profiler?.rendered.plugins?.achievements?.list?.filter(({leaderboard}) => leaderboard).sort((a, b) => a.leaderboard.type.localeCompare(b.leaderboard.type)) ?? []
      },
      achievements() {
        return this.profiler?.rendered.plugins?.achievements?.list?.filter(({leaderboard}) => !leaderboard).filter(({title}) => !/(?:automator|octonaut|infographile)/i.test(title)) ?? []
      },
      introduction() {
        return this.profiler?.rendered.plugins?.introduction?.text ?? ""
      },
      followup() {
        return this.profiler?.rendered.plugins?.followup ?? null
      },
      calendar() {
        if (this.profiler?.rendered.plugins?.calendar) {
          return Object.assign(this.profiler?.rendered.plugins?.calendar, {
            color(c) {
              return {
                "#ebedf0": "var(--color-calendar-graph-day-bg)",
                "#9be9a8": "var(--color-calendar-graph-day-L1-bg)",
                "#40c463": "var(--color-calendar-graph-day-L2-bg)",
                "#30a14e": "var(--color-calendar-graph-day-L3-bg)",
                "#216e39": "var(--color-calendar-graph-day-L4-bg)",
              }[c] ?? c
            },
          })
        }
        return null
      },
      isocalendar() {
        return (this.profiler?.rendered.plugins?.isocalendar?.svg ?? "")
          .replace(/#ebedf0/gi, "var(--color-calendar-graph-day-bg)")
          .replace(/#9be9a8/gi, "var(--color-calendar-graph-day-L1-bg)")
          .replace(/#40c463/gi, "var(--color-calendar-graph-day-L2-bg)")
          .replace(/#30a14e/gi, "var(--color-calendar-graph-day-L3-bg)")
          .replace(/#216e39/gi, "var(--color-calendar-graph-day-L4-bg)")
      },
      languages() {
        return Object.assign(this.profiler?.rendered.plugins?.languages?.favorites ?? [], {total: this.profiler?.rendered.plugins?.languages.total})
      },
      reactions() {
        return this.profiler?.rendered.plugins?.reactions ?? null
      },
      repositories() {
        return this.profiler?.rendered.plugins?.repositories?.list ?? []
      },
      stars() {
        return {repositories: this.profiler?.rendered.plugins?.stars?.repositories.map(({node, starredAt}) => ({...node, starredAt})) ?? []}
      },
      topics() {
        return this.profiler?.rendered.plugins?.topics?.list ?? []
      },
      activity() {
        return this.profiler?.rendered.plugins?.activity?.events ?? []
      },
      contributions() {
        return this.profiler?.rendered.plugins?.notable?.contributions ?? []
      },
      account() {
        if (!this.profiler)
          return null
        const {login, name} = this.profiler?.rendered.user
        return {login, name, avatar: this.profiler?.rendered.computed.avatar, type: this.profiler?.rendered.account}
      },
      url() {
        return `${window.location.protocol}//${window.location.host}/insights/${this.user}`
      },
      preview() {
        return /-preview$/.test(this.version)
      },
      beta() {
        return /-beta$/.test(this.version)
      },
      rlreset() {
        const reset = new Date(Math.max(this.requests.graphql.reset, this.requests.rest.reset))
        return `${reset.getHours()}:${reset.getMinutes()}`
      },
    },
    //Data initialization
    data: {
      version: "",
      hosted: null,
      user: "",
      embed: false,
      localstorage: false,
      searchable: false,
      requests: {rest: {limit: 0, used: 0, remaining: 0, reset: NaN}, graphql: {limit: 0, used: 0, remaining: 0, reset: NaN}, search: {limit: 0, used: 0, remaining: 0, reset: NaN}},
      palette: "light",
      profiler: null,
      pending: false,
      oauth: false,
      error: null,
      config: {},
      progress: 0,
      loaded: [],
    },
  })
})()
