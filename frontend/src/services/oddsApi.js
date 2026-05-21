// const API_KEY = import.meta.env.VITE_ODDS_API_KEY;

// export async function getNFLFutures() {
//   const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=outrights&apiKey=${API_KEY}`;

//   const res = await fetch(url);

//   if (!res.ok) {
//     throw new Error("Failed to fetch NFL futures");
//   }

//   const json = await res.json();
//   console.log("NFL futures response:", json);
//   return json;
// }
