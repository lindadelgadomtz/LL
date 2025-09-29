const create = jest.fn().mockResolvedValue({
    choices: [
        {
            message: {
                // Path 1: tools
                tool_calls: [
                    {
                        type: "function",
                        function: { arguments: JSON.stringify({ items: [] }) },
                    },
                ],
            },
        },
    ],
});

class OpenAI {
    chat = { completions: { create } };
}
export default OpenAI;
export { create as __openaiCreateMock };
