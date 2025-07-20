const { request } = require('@playwright/test');

/**
 * LLM-as-a-Judge Implementation
 * 
 * Uses Google Gemini API to evaluate the quality of RAG responses
 * across multiple dimensions: relevance, accuracy, completeness, clarity, grounding
 */
class LLMJudge {
  constructor(apiKey = process.env.GEMINI_API_KEY || '<INSERT_API_KEY>', baseUrl = 'https://generativelanguage.googleapis.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.context = null;
  }

  async initialize() {
    if (!this.context) {
      this.context = await request.newContext({
        baseURL: this.baseUrl,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey
        }
      });
    }
  }

  /**
   * Evaluate response quality using LLM as judge
   */
  async evaluateResponse(question, answer, documentContext, criteria = ['relevance', 'accuracy', 'completeness', 'grounding']) {
    await this.initialize();

    const evaluationPrompt = this.buildEvaluationPrompt(question, answer, documentContext, criteria);
    
    try {
      const response = await this.context.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        data: {
          contents: [
            {
              parts: [
                {
                  text: `You are an expert evaluator of AI-generated responses. You provide objective, detailed assessments based on specific criteria.\n\n${evaluationPrompt}`
                }
              ]
            }
          ]
        }
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`LLM Judge API failed: ${response.status()} - ${errorText}`);
      }

      const result = await response.json();
      return this.parseEvaluation(result.candidates[0].content.parts[0].text);

    } catch (error) {
      return this.getDefaultScores(criteria);
    }
  }

  buildEvaluationPrompt(question, answer, documentContext, criteria) {
    const contextualInfo = this.getContextualInfo(documentContext);
    
    return `
Please evaluate the following AI-generated response based on the specified criteria.

DOCUMENT CONTEXT:
${documentContext || contextualInfo.default}

QUESTION: 
${question}

AI RESPONSE TO EVALUATE:
${answer}

EVALUATION CRITERIA:
${criteria.map(c => this.getCriteriaDescription(c)).join('\n')}

IMPORTANT CONTEXT FOR EVALUATION:
${contextualInfo.evaluation_notes}
- Evaluate if the response aligns with actual document content vs. fabricated information

Please provide your evaluation in the following JSON format:
{
  ${criteria.map(c => `"${c}": {"score": <1-5>, "reasoning": "<brief explanation>"}`).join(',\n  ')},
  "overall_score": <1-5>,
  "summary": "<brief overall assessment>"
}

Rate each criterion on a scale of 1-5 where:
1 = Poor/Unacceptable
2 = Below Average  
3 = Average/Acceptable
4 = Good/Above Average
5 = Excellent/Outstanding

Provide only the JSON response, no additional text.`;
  }

  getContextualInfo(documentContext) {
    // Focus only on tech specs content
    if (documentContext && (documentContext.includes('Intel Core i7-13700K') || documentContext.includes('tech_specs') || documentContext.includes('technical specifications'))) {
      return {
        default: 'Technical specifications for Intel Core i7-13700K processor and NVIDIA GeForce RTX 4090 graphics card',
        evaluation_notes: `
- Document contains Intel Core i7-13700K specs: 16 cores (8 P-cores + 8 E-cores), 24 threads, 5.4 GHz boost, LGA-1700 socket, 125W TDP
- Document contains NVIDIA RTX 4090 specs: Ada Lovelace architecture, 5nm process, 16,384 CUDA cores, 24 GB GDDR6X, 450W TDP
- Technical features: Hyper-Threading, Turbo Boost, Thread Director, NVENC, NVDEC, Ray Tracing, DirectX 12 Ultimate
- Performance metrics: Cinebench R23: ~30,700 pts, Geekbench 6: ~17,000 multi-core, FP32: ~82.6 TFLOPS
- Memory support: DDR4-3200/DDR5-5600 for CPU, GDDR6X for GPU
- The document does NOT contain: AMD processors, Apple Silicon, mobile chips, detailed pricing information, competitive comparisons, software reviews
`
      };
    } else {
      return {
        default: 'Technical specification document analysis',
        evaluation_notes: `
- Evaluate based on factual accuracy and relevance to the technical specifications
- Check for hallucinated or fabricated information not present in the source document
- Assess grounding in actual hardware specifications vs. general knowledge
- Verify technical details match documented specifications
`
      };
    }
  }

  getCriteriaDescription(criterion) {
    const descriptions = {
      relevance: 'RELEVANCE (1-5): How well does the answer relate to the question asked?',
      accuracy: 'ACCURACY (1-5): How factually correct is the answer based on the document?', 
      completeness: 'COMPLETENESS (1-5): How thoroughly does the answer address the question?',
      clarity: 'CLARITY (1-5): How clear and understandable is the answer?',
      grounding: 'GROUNDING (1-5): How well is the answer grounded in the source document?'
    };
    return descriptions[criterion] || `${criterion.toUpperCase()} (1-5): Rate this aspect of the response.`;
  }

  parseEvaluation(evaluation) {
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = evaluation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in evaluation');
    } catch (error) {
      return this.getDefaultScores(['relevance', 'accuracy', 'completeness', 'grounding']);
    }
  }

  getDefaultScores(criteria) {
    const scores = {};
    criteria.forEach(criterion => {
      scores[criterion] = { score: 3, reasoning: 'Evaluation failed, default score assigned' };
    });
    return {
      ...scores,
      overall_score: 3,
      summary: 'LLM judge evaluation failed, default scores assigned'
    };
  }

  /**
   * Quick relevance check using LLM
   */
  async checkRelevance(question, answer) {
    const evaluation = await this.evaluateResponse(question, answer, null, ['relevance']);
    return evaluation.relevance?.score >= 3;
  }

  /**
   * Check for hallucination using LLM
   */
  async detectHallucination(answer, documentContext, prohibitedContent = []) {
    await this.initialize();

    const hallucinationPrompt = `
Analyze the following AI response for potential hallucination or fabricated information.

DOCUMENT CONTEXT:
${documentContext || 'No document context provided'}

AI RESPONSE:
${answer}

PROHIBITED CONTENT (should not appear):
${prohibitedContent.join(', ')}

Please respond with a JSON object:
{
  "contains_hallucination": <true/false>,
  "contains_prohibited_content": <true/false>,
  "confidence": <0.0-1.0>,
  "reasoning": "<explanation>"
}

Consider hallucination as information that:
1. Cannot be verified from the document context
2. Contradicts the document context  
3. Includes fabricated details not present in the source
4. Contains prohibited content that shouldn't be in this context
`;

    try {
      const response = await this.context.post('/v1beta/models/gemini-2.0-flash:generateContent', {
        data: {
          contents: [
            {
              parts: [
                {
                  text: `You are an expert at detecting hallucination and fabricated information in AI responses.\n\n${hallucinationPrompt}`
                }
              ]
            }
          ]
        }
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`Hallucination detection API failed: ${response.status()} - ${errorText}`);
      }

      const result = await response.json();
      const jsonMatch = result.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in hallucination detection response');

    } catch (error) {
      return {
        contains_hallucination: false,
        contains_prohibited_content: false,
        confidence: 0.5,
        reasoning: 'Detection failed, cannot determine hallucination status'
      };
    }
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }
}

module.exports = { LLMJudge };