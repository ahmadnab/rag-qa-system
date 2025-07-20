from setuptools import setup, find_packages

requires = []

setup(
    name='rag',
    version='0.0.0',
    description='Rag',
    long_description='''
    RAG
    ''',
    classifiers=[
        "Programming Language :: Python",
    ],
    author='Rameez Shuhaib',
    author_email='me@rameezshuhaib.com',
    # url='https://github.com/AnalysisCopilot/ai-backend',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    tests_require=[],
    setup_requires=[],
    install_requires=requires,
    dependency_links=[],
)