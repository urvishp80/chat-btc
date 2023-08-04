// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import { concatenateTextFields, getFinalAnswer} from "@/utils/openaiChat";

import type { PageConfig } from "next";

export const config: PageConfig = {
  runtime: "edge",
};

interface ElementType {
  type: "paragraph" | "heading";
  text: string;
}

interface Content {
  title: string;
  snippet: string;
  link: string;
}

interface CustomContent {
  title: string;
  snippet: string;
  link: string;
}

interface Result {
  _source: {
    title: string;
    body: string;
    url: string;
    body_type: string;
    type?: string; // Added the 'type' property as optional
  };
}

interface SummaryData {
  link: string;
  cleaned_text: string;
}

export function concatenateTextFields(data: string | ElementType[]): string {
  let concatenatedText = "";
  let elementArray: ElementType[];

  if (typeof data === "string") {
    try {
      elementArray = JSON.parse(data);
    } catch (e) {
      return data;
    }
  } else {
    elementArray = data;
  }

  // If data is an array of `ElementType`
  elementArray.forEach((element: ElementType) => {
    if (element.type === "paragraph") {
      concatenatedText += element.text + " ";
    } else if (element.type === "heading") {
      concatenatedText += "\n\n" + element.text + "\n\n";
    }
  });
  return concatenatedText.trim();
}

export function cleanText(text: string): string {
  text = text.replace(/[^\w\s.]/g, "").replace(/\s+/g, " ");
  return text;
}

export default async function handler(req: Request): Promise<Response> {
  const { inputs } = (await req.json()) as {
    inputs?: { question: string; searchResults: any[] | undefined }[];
  };

  if (!inputs || !inputs[0]) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  try {
    const question = inputs[0].question;
    const searchResults = inputs[0].searchResults;
    let result;

    if (searchResults) {
      for (let item of searchResults) {
        let source = item._source;
        if (
          source.domain.includes("bitcoin-dev") ||
          source.domain.includes("lightning-dev")
        ) {
          if ("summary" in source) {
            source.body = source.summary;
          }
        }
      }
    }

    if (!question) {
      return new Response(JSON.stringify({ error: "Question not provided" }), {
        status: 400,
      });
    }
    // const result = await processInput(searchResults, question);
    try {
      if (!searchResults) {
        let output_string: string = `I am not able to find an answer to this question. So please rephrase your question and ask again.`;
        result = output_string;
      } else {
        const intermediateContent: (CustomContent | null)[] = searchResults.map(
          (result: Result) => {
            let results = result._source;
            const isQuestionOnStackExchange =
              results.type === "question" &&
              results.url.includes("stackexchange");
            const isMarkdown = results.body_type === "markdown";
            const snippet = isMarkdown
              ? concatenateTextFields(results.body)
              : results.body;
            return isQuestionOnStackExchange
              ? null
              : {
                  title: results.title,
                  snippet: snippet,
                  link: results.url,
                };
          }
        );

        // const deduplicatedContent = removeDuplicatesByID(intermediateContent);
        const seen = new Set();
        const filteredArr = intermediateContent.filter((item) => {
          if (item === null) return false;
          const isDuplicate = seen.has(item.link);
          seen.add(item.link);
          return !isDuplicate;
        });

        const extractedContent: CustomContent[] = filteredArr.filter(
          (item: CustomContent | null) => item !== null
        ) as CustomContent[];

        const cleanedContent = extractedContent.slice(0, 6).map((content) => ({
          title: cleanText(content.title),
          snippet: cleanText(content.snippet),
          link: content.link,
        }));

        const cleanedTextWithLink = cleanedContent.map((content: Content) => ({
          cleaned_text: content.snippet,
          link: content.link,
        }));

        const slicedTextWithLink = cleanedTextWithLink.map(
          (content: SummaryData) => ({
            cleaned_text: content.cleaned_text.slice(0, 2000),
            link: content.link,
          })
        );

        // const prompt = _example(question, slicedTextWithLink);
        let prompt = `QUESTION: ${question}\n`;
        prompt += "CONTENT:\n";
        prompt += '"""\n';
        slicedTextWithLink.forEach((d: SummaryData, i: number) => {
          if (i > 0) {
            prompt += "\n";
          }
          prompt += `link [${i}]: ${d.link}\n`;
          prompt += `content: ${d.cleaned_text.replaceAll("\n", " ")}\n`;
        });
        prompt += '"""\n';

        // const summary = await SummaryGenerate(question, prompt);
        let summary;
        let retry = 0;
        while (retry < 3) {
          try {
            const payload = {
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are an AI assistant providing helpful answers.",
                },
                {
                  role: "user",
                  content: `You are given the following extracted parts of a long document and a question. Provide a conversational detailed answer in the same writing style as based on the context provided. DO NOT include any external references or links in the answers. If you are absolutely certain that the answer cannot be found in the context below, just say 'I cannot find the proper answer to your question. Although I'm not entirely certain, further research on the topic may provide you with more accurate information.' Don't try to make up an answer. If the question is not related to the context, politely respond that 'There is no answer to the question you asked based on the given context, but further research on the topic may help you find the information you're seeking.'Question: ${question} ========= ${prompt}=========`,
                },
              ],
              temperature: 0.7,
              top_p: 1.0,
              frequency_penalty: 0.0,
              presence_penalty: 1,
              max_tokens: 700,
              stream: true,
            };

            const response = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
                },
                method: "POST",
                body: JSON.stringify(payload),
              }
            );


            if (!response.ok) {
              console.log(response);
              summary =
                "I am not able to provide you with a proper answer to the question, but you can follow up with the links provided to find the answer on your own. Sorry for the inconvenience.";
              break;
            }

            const jsonResponse = await response.json();
            console.log(`openai call json response: ${jsonResponse}`);
            
            summary = jsonResponse?.choices?.[0]?.message?.content || "";
            console.log(`openai call summary response: ${summary}`);

            break;
          } catch (error) {
            if (retry < 2) {
              retry++;
              continue;
            } else {
              summary =
                "Currently server is overloaded with API calls, please try again later.";
              break;
            }
          }
        }

        // const finalAnswer = await getFinalAnswer(question, summary, slicedTextWithLink);
        let data = summary.trim() + "\n\n";
        slicedTextWithLink.forEach((d: SummaryData, i: number) => {
          data += `[${i}]: ${d.link}\n`;
        });
        // return { question: question, data };
        result = data;
        // console.log(result);
      }
    } catch (error) {
      result =
        "The system is overloaded with requests, can you please ask your question in 5 seconds again? Thank you!";
    }
    return new Response(result);
  } catch (err) {
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
    });
  }
}
