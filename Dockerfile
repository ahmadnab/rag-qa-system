FROM python:3.10

RUN apt-get update && apt-get install ffmpeg libsm6 libxext6  -y

RUN pip install pipenv

ADD Pipfile /tmp/app/
ADD Pipfile.lock /tmp/app/

RUN cd /tmp/app && pipenv install --system --dev

ADD . /tmp/app

WORKDIR /tmp/app