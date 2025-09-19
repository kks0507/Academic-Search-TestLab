"use client"

import { useState, type FormEvent } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"

// 추출될 정보의 타입을 정의합니다.
interface BookInfo {
  title: string
  author: string
  publisher: string
  publicationYear: string
  genre: string
  language: string
}

interface QuestionResult {
  question: string
  result: BookInfo | null
  error: string | null
  isLoading: boolean
}

// AI에게 전달할 프롬프트 템플릿입니다.
const PROMPT_TEMPLATE = `
# [Instruction]
You are an expert AI that analyzes a user's query to extract factual information about a book. Your single task is to populate a JSON object with the data found directly in the user's text.

# [Input Data]
- user_prompt: {user_prompt}

---
# [Extraction Rules]
1.  Carefully read the \`user_prompt\`.
2.  Identify and extract only the following 6 pieces of information if they are explicitly mentioned:
    * \`title\`: The title of the book.
    * \`author\`: The author's name.
    * \`publisher\`: The publisher's name.
    * \`publicationYear\`: The year the book was published.
    * \`genre\`: The genre of the book.
    * \`language\`: The language of the book.
3.  If a specific piece of information cannot be found in the prompt, you MUST leave its value as an empty string \`""\`.
4.  Do not infer, guess, or add any information that is not explicitly stated in the \`user_prompt\`.

# [Output JSON Format]
Respond with ONLY the following JSON object. Do not include any other text, explanations, or markdown formatting.
{{
  "title": "",
  "author": "",
  "publisher": "",
  "publicationYear": "",
  "genre": "",
  "language": ""
}}
`

export default function Home() {
  const [apiKeys, setApiKeys] = useState<string[]>([])
  const [selectedApiKey, setSelectedApiKey] = useState<string>("")
  const [newApiKey, setNewApiKey] = useState<string>("")
  const [showAddForm, setShowAddForm] = useState<boolean>(false)

  const [questions, setQuestions] = useState<QuestionResult[]>([
    { question: "J.K. 롤링의 해리포터 찾아줘.", result: null, error: null, isLoading: false },
    { question: "", result: null, error: null, isLoading: false },
    { question: "", result: null, error: null, isLoading: false },
    { question: "", result: null, error: null, isLoading: false },
    { question: "", result: null, error: null, isLoading: false },
  ])

  const handleAddApiKey = () => {
    if (newApiKey.trim() && !apiKeys.includes(newApiKey.trim())) {
      const updatedKeys = [...apiKeys, newApiKey.trim()]
      setApiKeys(updatedKeys)
      setSelectedApiKey(newApiKey.trim())
      setNewApiKey("")
      setShowAddForm(false)
    }
  }

  const handleDeleteApiKey = (keyToDelete: string) => {
    const updatedKeys = apiKeys.filter((key) => key !== keyToDelete)
    setApiKeys(updatedKeys)
    if (selectedApiKey === keyToDelete) {
      setSelectedApiKey(updatedKeys[0] || "")
    }
  }

  const updateQuestion = (index: number, question: string) => {
    const newQuestions = [...questions]
    newQuestions[index].question = question
    setQuestions(newQuestions)
  }

  const processQuestion = async (index: number) => {
    if (!selectedApiKey.trim() || !questions[index].question.trim()) {
      const newQuestions = [...questions]
      newQuestions[index].error = "API 키와 질문을 모두 입력해주세요."
      setQuestions(newQuestions)
      return
    }

    const newQuestions = [...questions]
    newQuestions[index].isLoading = true
    newQuestions[index].result = null
    newQuestions[index].error = null
    setQuestions(newQuestions)

    try {
      const genAI = new GoogleGenerativeAI(selectedApiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      const finalPrompt = PROMPT_TEMPLATE.replace("{user_prompt}", questions[index].question)
      const generationResult = await model.generateContent(finalPrompt)
      const responseText = generationResult.response.text()

      const cleanJsonStr = responseText
        .trim()
        .replace(/^```json|```$/g, "")
        .trim()
      const data: BookInfo = JSON.parse(cleanJsonStr)

      newQuestions[index].result = data
      newQuestions[index].error = null
    } catch (err) {
      console.error(err)
      newQuestions[index].error = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
    } finally {
      newQuestions[index].isLoading = false
      setQuestions(newQuestions)
    }
  }

  const handleSubmitAll = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedApiKey.trim()) {
      alert("API 키를 선택해주세요.")
      return
    }

    const validQuestions = questions.filter((q) => q.question.trim())
    if (validQuestions.length === 0) {
      alert("최소 하나의 질문을 입력해주세요.")
      return
    }

    // 모든 유효한 질문들을 동시에 처리
    const promises = questions.map((q, index) => {
      if (q.question.trim()) {
        return processQuestion(index)
      }
      return Promise.resolve()
    })

    await Promise.all(promises)
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-8 font-sans">
      <main className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">📚 책 정보 팩트 추출 테스트베드</h1>
          <p className="text-gray-600 mt-2">Gemini 프롬프트를 사용하여 문장에서 책 관련 정보를 추출합니다.</p>
        </header>

        <form onSubmit={handleSubmitAll} className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <div>
            <label className="block text-lg font-semibold mb-2 text-gray-700">Gemini API 키 선택:</label>

            {apiKeys.length > 0 && (
              <div className="mb-3">
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">API 키를 선택하세요</option>
                  {apiKeys.map((key, index) => (
                    <option key={index} value={key}>
                      API 키 #{index + 1} ({key.slice(0, 8)}...{key.slice(-4)})
                    </option>
                  ))}
                </select>

                {selectedApiKey && (
                  <button
                    type="button"
                    onClick={() => handleDeleteApiKey(selectedApiKey)}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    선택된 API 키 삭제
                  </button>
                )}
              </div>
            )}

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
              >
                + 새 API 키 추가
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="새 API 키를 입력하세요"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddApiKey}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewApiKey("")
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">질문 입력 (최대 5개)</h2>

            {questions.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700">질문 #{index + 1}</h3>
                  {item.question.trim() && (
                    <button
                      type="button"
                      onClick={() => processQuestion(index)}
                      disabled={item.isLoading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition text-sm"
                    >
                      {item.isLoading ? "처리중..." : "개별 실행"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 입력 칸 */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-600">입력:</label>
                    <textarea
                      value={item.question}
                      onChange={(e) => updateQuestion(index, e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition text-sm"
                      placeholder={`질문 ${index + 1}을 입력하세요...`}
                    />
                  </div>

                  {/* 답변 칸 */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-600">답변:</label>
                    <div className="h-24 p-3 border border-gray-200 rounded-md bg-gray-50 overflow-y-auto">
                      {item.isLoading && <div className="text-blue-600 text-sm">처리 중...</div>}
                      {item.error && <div className="text-red-600 text-sm">{item.error}</div>}
                      {item.result && (
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                          {JSON.stringify(item.result, null, 2)}
                        </pre>
                      )}
                      {!item.isLoading && !item.error && !item.result && (
                        <div className="text-gray-400 text-sm">결과가 여기에 표시됩니다</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={questions.some((q) => q.isLoading)}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200 text-lg"
          >
            {questions.some((q) => q.isLoading) ? "처리 중..." : "모든 질문 동시 실행"}
          </button>
        </form>
      </main>
    </div>
  )
}
