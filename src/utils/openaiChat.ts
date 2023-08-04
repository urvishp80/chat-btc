// moved to chat.ts

// const _example = (question: string, summaries: SummaryData[]): string => {
//   let prompt = `QUESTION: ${question}\n`;
//   prompt += "CONTENT:\n";
//   prompt += '"""\n';
//   summaries.forEach((d: SummaryData, i: number) => {
//     if (i > 0) {
//       prompt += "\n";
//     }
//     prompt += `link [${i}]: ${d.link}\n`;
//     prompt += `content: ${d.cleaned_text.replaceAll("\n", " ")}\n`;
//   });
//   prompt += '"""\n';
//   return prompt;
// };

// async function SummaryGenerate(question: string, ans: string): Promise<string> {
//   async function SummaryGenerateCall(
//     question: string,
//     ans: string,
//     retry: number = 0
//   ): Promise<string> {
//     try {
//       const payload = {
//         model: "gpt-3.5-turbo",
//         messages: [
//           {
//             role: "system",
//             content: "You are an AI assistant providing helpful answers.",
//           },
//           {
//             role: "user",
//             content: `You are given the following extracted parts of a long document and a question. Provide a conversational detailed answer in the same writing style as based on the context provided. DO NOT include any external references or links in the answers. If you are absolutely certain that the answer cannot be found in the context below, just say 'I cannot find the proper answer to your question. Although I'm not entirely certain, further research on the topic may provide you with more accurate information.' Don't try to make up an answer. If the question is not related to the context, politely respond that 'There is no answer to the question you asked based on the given context, but further research on the topic may help you find the information you're seeking.'Question: ${question} ========= ${ans}=========`,
//           },
//         ],
//         temperature: 0.7,
//         top_p: 1.0,
//         frequency_penalty: 0.0,
//         presence_penalty: 1,
//         max_tokens: 700,
//         stream: true,
//       };
//       const response = await fetch(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
//           },
//           method: "POST",
//           body: JSON.stringify(payload),
//         }
//       );
//       if (!response.ok) {
//         // if response is not ok (status code is not 2xx), throw an error to handle it in the catch block
//         console.log(response);
//         return "I am not able to provide you with a proper answer to the question, but you can follow up with the links provided to find the answer on your own. Sorry for the inconvenience.";
//       }
//       const jsonResponse = await response.json();
//       return jsonResponse?.choices?.[0]?.message?.content || "";

//       // const stream = new ReadableStream({
//       //   async start(controller) {
//       //     const encoder = new TextEncoder();

//       //     for await (const part of jsonResponse) {
//       //       const text = part.choices[0]?.delta.content || "";
//       //       const chunk = encoder.encode(text);
//       //       controller.enqueue(chunk);
//       //     }
//       //     controller.close();
//       //   },
//       // });

//       // const res = new Response(stream);
//       // const resString = await res.text();
//       // return resString;
      
//     } catch (error) {
//       if (retry < 2) {
//         return SummaryGenerateCall(question, ans, retry + 1);
//       } else {
//         return "Currently server is overloaded with API calls, please try again later.";
//       }
//     }
//   }
//   return SummaryGenerateCall(question, ans);
// }

// function removeDuplicatesByID(
//   arr: (CustomContent | null)[]
// ): (CustomContent | null)[] {
//   const seen = new Set();
//   const filteredArr = arr.filter((item) => {
//     if (item === null) return false;
//     const isDuplicate = seen.has(item.link);
//     seen.add(item.link);
//     return !isDuplicate;
//   });
//   return filteredArr;
// }

// export async function getFinalAnswer(
//   question: string,
//   summary: string,
//   content: SummaryData[]
// ): Promise<{ question: string; data: string }> {
//   let data = summary.trim() + "\n\n";

//   content.forEach((d: SummaryData, i: number) => {
//     data += `[${i}]: ${d.link}\n`;
//   });
//   return { question: question, data };
// }

// export async function processInput(
//   searchResults: any[] | undefined,
//   question: string
// ): Promise<string> {

// }
